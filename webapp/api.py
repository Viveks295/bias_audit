from flask import Flask, request, jsonify, send_file, Blueprint
from flask_cors import CORS
import pandas as pd
import tempfile
import os
import json
import traceback
from typing import Dict, Any, List
import importlib.util
from ai_bias_audit.auditor import Auditor
from ai_bias_audit.variations import get_variation
from openai import OpenAI
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Global storage for audit sessions
audit_sessions = {}

# Global storage for uploaded CSV files (session_id -> DataFrame)
csv_storage = {}

def send_email_notification(email: str, session_id: str, base_url: str = "http://localhost:3000"):
    """Send email notification when audit is complete."""
    try:
        results_url = f"{base_url}/results?sessionId={session_id}"
        subject = "Your Bias Audit is Ready!"
        body = f"Your bias audit is complete. View your results here: {results_url}"

        if not EMAIL_ENABLED:
            print(f"[EMAIL DISABLED] Would send to: {email}\nSubject: {subject}\nBody: {body}")
            return False

        msg = MIMEMultipart()
        msg['From'] = FROM_EMAIL
        msg['To'] = email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"Email notification sent to {email} for session {session_id}")
        return True
    except Exception as e:
        print(f"Failed to send email notification: {str(e)}")
        return False

# Email configuration (set these environment variables in production)
EMAIL_ENABLED = os.environ.get('EMAIL_ENABLED', 'false').lower() == 'true'
SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USERNAME = os.environ.get('SMTP_USERNAME', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
FROM_EMAIL = os.environ.get('FROM_EMAIL', 'noreply@biasaudit.com')

api = Blueprint('api', __name__)
CORS(api)  # Enable CORS specifically for the API Blueprint

@api.route('/api/variations', methods=['GET'])
def get_variations():
    """Get available variations."""
    variations = {
        'spelling': {
            'id': 'spelling',
            'name': 'Spelling Errors',
            'description': 'Introduce spelling mistakes in the text',
            'magnitudeRange': [10, 50],
            'defaultMagnitude': 30,
        },
        'spanglish': {
            'id': 'spanglish',
            'name': 'Spanglish',
            'description': 'Mix Spanish and English words',
            'magnitudeRange': [20, 80],
            'defaultMagnitude': 50,
        },
        'noun_transfer': {
            'id': 'noun_transfer',
            'name': 'Noun Transfer',
            'description': 'Replace nouns with similar ones',
            'magnitudeRange': [15, 60],
            'defaultMagnitude': 40,
        },
        'cognates': {
            'id': 'cognates',
            'name': 'Cognates',
            'description': 'Use cognate words from other languages',
            'magnitudeRange': [10, 40],
            'defaultMagnitude': 25,
        },
        'pio': {
            'id': 'pio',
            'name': 'PIO (Part-of-Speech)',
            'description': 'Modify part-of-speech patterns',
            'magnitudeRange': [20, 70],
            'defaultMagnitude': 45,
        },
    }
    return jsonify(list(variations.values()))

@api.route('/api/preview', methods=['POST'])
def preview_variation():
    """Preview a variation on sample data."""
    data = request.json
    variation_name = data.get('variationName')
    magnitude = data.get('magnitude', 30)
    n_samples = data.get('nSamples', 5)
    
    # For now, return mock preview data
    # In a real implementation, you would load actual data and apply variations
    preview_data = {
        'samples': [
            {
                'index': i,
                'original_text': f'Sample text {i} for preview.',
                'perturbed_text': f'Sample text {i} with {variation_name} variation applied.',
            }
            for i in range(n_samples)
        ]
    }
    
    return jsonify(preview_data)

@api.route('/api/audit', methods=['POST'])
def start_audit():
    """Start a new audit."""
    try:
        # Get audit state from form data
        audit_state_json = request.form.get('auditState')
        if not audit_state_json:
            return jsonify({'error': 'No audit state provided'}), 400
        
        try:
            audit_state = json.loads(audit_state_json)
        except json.JSONDecodeError as e:
            return jsonify({'error': f'Invalid audit state JSON: {str(e)}'}), 400
        
        # Validate audit state structure
        if not isinstance(audit_state, dict):
            return jsonify({'error': 'Audit state must be an object'}), 400
        
        if 'selectedVariations' not in audit_state:
            return jsonify({'error': 'No variations selected in audit state'}), 400
        
        # Handle file uploads
        data_file = request.files.get('data')
        model_script = request.files.get('modelScript')
        
        # Create a unique session ID
        session_id = f"audit_{len(audit_sessions) + 1}"
        
        # Store audit state
        audit_sessions[session_id] = {
            'state': audit_state,
            'status': 'processing'
        }
        
        # Load the data file
        if not data_file:
            return jsonify({'error': 'No data file provided'}), 400
        
        df = pd.read_csv(data_file)
        if 'text' not in df.columns:
            return jsonify({'error': 'CSV must contain a "text" column'}), 400
        
        # Set up the model based on audit state
        model_type = audit_state.get('selectedLLM', {}).get('type', 'custom')
        ai_prompt = audit_state.get('aiPrompt', '')
        rubric = audit_state.get('rubric', '')
        
        if model_type == 'custom':
            # Load custom model from stored file
            if not model_script:
                return jsonify({"error": "Custom model file required"}), 400
            
            # Save model script to temporary location
            temp_dir = tempfile.mkdtemp(prefix="custom_model_")
            model_path = os.path.join(temp_dir, model_script.filename)
            model_script.save(model_path)
            
            spec = importlib.util.spec_from_file_location("model_module", model_path)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            if not hasattr(mod, "grade"):
                return jsonify({"error": "Custom script must define grade(text)"}), 500
            grade_fn = mod.grade
        else:
            # Use OpenAI API for grading
            client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
            if not os.environ.get('OPENAI_API_KEY'):
                return jsonify({'error': 'OpenAI API key not set'}), 500
            def grade_fn(text: str) -> float:
                prompt = f"{ai_prompt}\nRubric: {rubric}\n Respond with only a number\nText: {text}\nGrade:"
                try:
                    response = client.chat.completions.create(
                        model='gpt-4o-2024-08-06' if model_type == 'gpt-4o' else 'gpt-4.1-2025-04-14',
                        messages=[{"role": "user", "content": prompt}],
                        max_tokens=10,
                        temperature=0
                    )
                    pred = response.choices[0].message.content.strip()
                    return float(pred)
                except Exception:
                    return float('nan')
        
        # Apply score cutoff if specified
        score_cutoff = None
        if audit_state.get('useScoreCutoff') and audit_state.get('cutoffScore'):
            score_cutoff = float(audit_state['cutoffScore'])
        
        # Get grouping variable if specified
        group_col = None
        if audit_state.get('useGrouping') and audit_state.get('groupingVariable'):
            group_col = audit_state['groupingVariable']
        
        # Get variations and magnitudes
        variations = [v['id'] for v in audit_state.get('selectedVariations', [])]
        magnitudes = [audit_state.get('variationMagnitudes', {}).get(v['id'], 50) for v in audit_state.get('selectedVariations', [])]
        
        if not variations:
            return jsonify({'error': 'No variations selected'}), 400
        
        # Debug logging
        print(f"Selected variations: {variations}")
        print(f"Selected magnitudes: {magnitudes}")
        
        # Create auditor and run audit
        auditor = Auditor(model=grade_fn, data=df)
        bias_df = auditor.audit(variations, magnitudes, score_cutoff=score_cutoff, group_col=group_col)
        
        # Calculate moments during the initial audit
        moments = []
        try:
            print(f"Calculating moments for session {session_id} with group_col: {group_col}")
            moments_df = auditor.audit_moments(group_col=group_col)
            moments = moments_df.to_dict(orient="records")
            print(f"Successfully calculated {len(moments)} moments")
        except Exception as e:
            print(f"Moments calculation error during audit: {str(e)}")
            traceback.print_exc()
            moments = []
            # For custom models, provide a more specific error message
            if model_type == 'custom':
                print(f"Custom model moments calculation failed: {str(e)}")
        
        # Convert results to the expected format
        results = []
        for _, row in bias_df.iterrows():
            result = {
                'variation': row['variation'],
                'magnitude': row['magnitude'],
                'originalGrade': float(row['original_grade']),
                'perturbedGrade': float(row['perturbed_grade']),
                'difference': float(row['difference']),
                'biasMeasures': {
                    'bias_0': float(row['bias_0']),
                    'bias_1': float(row['bias_1']),
                    'bias_2': float(row['bias_2']),
                    'bias_3': float(row['bias_3']),
                }
            }
            if 'group' in row:
                result['group'] = str(row['group'])
            results.append(result)
        
        # Calculate summary statistics
        total_variations = len(set(r['variation'] for r in results))
        average_grade_change = sum(r['difference'] for r in results) / len(results)
        max_bias_measure = max(abs(r['biasMeasures']['bias_1']) for r in results)
        groups_analyzed = len(set(r.get('group', 'default') for r in results))
        
        audit_sessions[session_id]['results'] = results
        audit_sessions[session_id]['moments'] = moments  # Store moments from initial audit
        audit_sessions[session_id]['status'] = 'completed'
        
        # Send email notification if email is provided
        notification_email = audit_state.get('notificationEmail')
        if notification_email:
            send_email_notification(notification_email, session_id)
        
        return jsonify({
            'sessionId': session_id,
            'status': 'completed',
            'results': results,
            'summary': {
                'totalVariations': total_variations,
                'averageGradeChange': average_grade_change,
                'maxBiasMeasure': max_bias_measure,
                'groupsAnalyzed': groups_analyzed,
            },
            'moments': moments
        })
        
    except Exception as e:
        print(f"Audit error: {str(e)}")
        return jsonify({'error': str(e)}), 400

@api.route('/api/results/<session_id>', methods=['GET'])
def get_results(session_id):
    """Get audit results for a session."""
    try:
        # Check both audit_sessions and csv_storage
        session_data = None
        
        if session_id in audit_sessions:
            session_data = audit_sessions[session_id]
        elif session_id in csv_storage:
            # If it's a csv session, we need to check if there are any audit results
            # For now, return an error indicating this session doesn't have audit results
            return jsonify({'error': 'This session does not contain audit results. Please run an audit first.'}), 404
        else:
            return jsonify({'error': 'Session not found'}), 404
        
        if session_data['status'] != 'completed':
            return jsonify({'error': 'Audit not completed'}), 400
        
        results = session_data['results']
        
        # Calculate summary statistics
        total_variations = len(results)
        average_grade_change = sum(r['difference'] for r in results) / total_variations
        max_bias_measure = max(abs(r['biasMeasures']['bias_1']) for r in results)
        groups_analyzed = len(set(r.get('group', 'default') for r in results))

        # Get stored moments from the initial audit
        moments = session_data.get('moments', [])
        
        # Debug logging
        print(f"Session {session_id} - Results count: {len(results)}, Moments count: {len(moments)}")
        print(f"Session data keys: {list(session_data.keys())}")
        
        # If moments don't exist (older sessions), return empty array
        if 'moments' not in session_data:
            print(f"Warning: No moments found in session {session_id}, returning empty array")
            moments = []

        return jsonify({
            'results': results,
            'summary': {
                'totalVariations': total_variations,
                'averageGradeChange': average_grade_change,
                'maxBiasMeasure': max_bias_measure,
                'groupsAnalyzed': groups_analyzed,
            },
            'moments': moments
        })
    except Exception as e:
        print(f"Error in get_results for session {session_id}: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@api.route('/api/download/<session_id>', methods=['GET'])
def download_results(session_id):
    """Download audit results as CSV."""
    if session_id not in audit_sessions:
        return jsonify({'error': 'Session not found'}), 404
    
    session_data = audit_sessions[session_id]
    
    if session_data['status'] != 'completed':
        return jsonify({'error': 'Audit not completed'}), 400
    
    results = session_data['results']
    
    # Create CSV content
    csv_content = "Variation,Magnitude,Original Grade,Perturbed Grade,Difference,Bias_0,Bias_1,Bias_2,Bias_3,Group\n"
    
    for result in results:
        csv_content += f"{result['variation']},{result['magnitude']},{result['originalGrade']},{result['perturbedGrade']},{result['difference']},{result['biasMeasures']['bias_0']},{result['biasMeasures']['bias_1']},{result['biasMeasures']['bias_2']},{result['biasMeasures']['bias_3']},{result.get('group', '')}\n"
    
    # Create temporary file
    temp_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.csv')
    temp_file.write(csv_content)
    temp_file.close()
    
    return send_file(
        temp_file.name,
        as_attachment=True,
        download_name=f'audit_results_{session_id}.csv',
        mimetype='text/csv'
    )

@api.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'healthy', 'message': 'AI Bias Audit API is running'})

@api.route('/api/assess_performance', methods=['POST'])
def assess_performance():
    # Get files and form data
    csv_file = request.files.get('csv_file')
    model_type = request.form.get('model_type')
    ai_prompt = request.form.get('ai_prompt')
    rubric = request.form.get('rubric')
    metric = request.form.get('metric')
    custom_model_file = request.files.get('custom_model_file')

    if not csv_file or not model_type:
        return jsonify({'error': 'Missing required fields'}), 400

    # Read CSV
    df = pd.read_csv(csv_file)
    if 'text' not in df.columns:
        return jsonify({'error': 'CSV must contain a "text" column'}), 400
    
    # Store the full CSV and model info for later use
    session_id = f"csv_{len(csv_storage) + 1}"
    
    # Store model info and data
    session_data = {
        'data': df,
        'model_type': model_type,
        'ai_prompt': ai_prompt or '',
        'rubric': rubric or '',
        'custom_model_path': None
    }
    
    # Handle custom model file storage
    if model_type == 'custom' and custom_model_file:
        # Save custom model file to persistent location
        temp_dir = tempfile.mkdtemp(prefix="custom_model_")
        model_path = os.path.join(temp_dir, custom_model_file.filename)
        custom_model_file.save(model_path)
        session_data['custom_model_path'] = model_path
    
    csv_storage[session_id] = session_data
    
    sample_df = df.sample(n=min(10, len(df)), random_state=42)

    # Prepare results
    results = []
    true_grades = []
    pred_grades = []

    # Custom model grading
    if model_type == 'custom':
        if not custom_model_file:
            return jsonify({'error': 'Custom model file required'}), 400
        
        # Use the stored model path from session_data
        model_path = session_data['custom_model_path']
        if not model_path or not os.path.exists(model_path):
            return jsonify({'error': 'Custom model file not found'}), 500
            
        try:
            spec = importlib.util.spec_from_file_location('custom_model', model_path)
            custom_model = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(custom_model)
            
            # Check if grade function exists
            if not hasattr(custom_model, 'grade'):
                return jsonify({'error': 'Custom model must define a grade(text) function'}), 500
                
            # Assume the custom model has a function grade(text: str) -> float/int
            for _, row in sample_df.iterrows():
                text = row['text']
                pred = custom_model.grade(text)
                pred_grades.append(pred)
                true = row['true_grade'] if 'true_grade' in row else None
                if true is not None:
                    true_grades.append(true)
                results.append({'text': text, 'predicted_grade': pred, 'true_grade': true})
        except Exception as e:
            return jsonify({'error': f'Error loading custom model: {str(e)}'}), 500
    else:
        # Use OpenAI API for grading
        client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
        if not os.environ.get('OPENAI_API_KEY'):
            return jsonify({'error': 'OpenAI API key not set'}), 500
        for _, row in sample_df.iterrows():
            text = row['text']
            prompt = f"{ai_prompt}\nRubric: {rubric}\n Respond with only a number\nText: {text}\nGrade:"
            try:
                response = client.chat.completions.create(
                    model='gpt-4o-2024-08-06' if model_type == 'gpt-4o' else 'gpt-4.1-2025-04-14',
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=10,
                    temperature=0
                )
                pred = response.choices[0].message.content.strip()
            except Exception as e:
                pred = f"Error: {str(e)}"
            pred_grades.append(pred)
            true = row['true_grade'] if 'true_grade' in row else None
            if true is not None:
                true_grades.append(true)
            results.append({'text': text, 'predicted_grade': pred, 'true_grade': true})

    # Compute metric if possible
    metric_value = None
    if true_grades and metric:
        try:
            y_true = [float(x) for x in true_grades]
            y_pred = [float(x) for x in pred_grades]
            if metric == 'accuracy':
                metric_value = sum(1 for a, b in zip(y_true, y_pred) if a == b) / len(y_true)
            elif metric == 'mse':
                metric_value = sum((a - b) ** 2 for a, b in zip(y_true, y_pred)) / len(y_true)
            elif metric == 'mae':
                metric_value = sum(abs(a - b) for a, b in zip(y_true, y_pred)) / len(y_true)
            elif metric == 'r2':
                mean_true = sum(y_true) / len(y_true)
                ss_tot = sum((a - mean_true) ** 2 for a in y_true)
                ss_res = sum((a - b) ** 2 for a, b in zip(y_true, y_pred))
                metric_value = 1 - ss_res / ss_tot if ss_tot != 0 else None
        except Exception:
            metric_value = None

    return jsonify({
        'session_id': session_id,  # Return session_id for later use
        'samples': results,
        'metric': metric,
        'metric_value': metric_value
    })

@api.route('/api/sample-variations', methods=['POST'])
def sample_variations():
    """Sample rows from uploaded CSV and generate variations for each selected variation type."""
    data = request.json
    session_id = data.get('session_id')
    variation_types = data.get('variation_types', [])
    sample_size = data.get('sample_size', 5)
    magnitude = data.get('magnitude', 50)

    if not session_id or session_id not in csv_storage:
        return jsonify({'error': 'Invalid session_id or CSV not found'}), 400

    if not variation_types:
        return jsonify({'error': 'No variation types specified'}), 400

    # Get the stored CSV
    df = csv_storage[session_id]['data']
    
    # Sample rows from the CSV
    if len(df) < sample_size:
        sample_size = len(df)
    
    sampled_rows = df.sample(n=sample_size, random_state=42)
    
    # Generate variations for each sampled row
    samples = []
    
    for idx, row in sampled_rows.iterrows():
        original_text = row['text']
        row_data = {
            'row_index': int(idx),
            'original': original_text,
            'variations': {}
        }
        
        # Apply each variation type to this text
        for variation_type in variation_types:
            try:
                variation = get_variation(variation_type)
                # Set a fixed seed for consistency across variations for this sample
                random.seed(idx)
                varied_text = variation.apply(original_text, magnitude)
                row_data['variations'][variation_type] = varied_text
            except Exception as e:
                row_data['variations'][variation_type] = f"Error: {str(e)}"
        
        samples.append(row_data)
    
    return jsonify({
        'samples': samples,
        'total_rows': len(df),
        'sampled_rows': sample_size
    })

@api.route('/api/preview_audit', methods=['POST'])
def preview_audit():
    """
    Preview audit results for 5 sample texts with the user's model and selected variation/magnitude.
    Expects JSON: {
        "session_id": str,
        "sample_texts": [str, ...],
        "variation": str,
        "magnitude": int
    }
    Returns: {
        "bias_table": [...],
        "moments_table": [...]
    }
    """
    data = request.get_json()
    session_id = data.get("session_id")
    sample_texts = data.get("sample_texts", [])
    variation = data.get("variation")
    magnitude = data.get("magnitude", 50)

    print(f"[DEBUG] /api/preview_audit called with session_id: {session_id}")
    print(f"[DEBUG] Current csv_storage keys: {list(csv_storage.keys())}")

    if not session_id or not sample_texts or not variation:
        return jsonify({"error": "Missing required fields."}), 400
    if len(sample_texts) != 5:
        return jsonify({"error": "Must provide 5 sample texts."}), 400

    # Use csv_storage for preview steps
    session_data = csv_storage.get(session_id)
    if session_data is None:
        print(f"[DEBUG] Session {session_id} not found in csv_storage.")
        return jsonify({"error": "Session not found."}), 404
    print(f"[DEBUG] Using csv_storage for preview.")

    # Reconstruct the real model using stored model info
    model_type = session_data['model_type']
    ai_prompt = session_data['ai_prompt']
    rubric = session_data['rubric']
    custom_model_path = session_data['custom_model_path']

    if model_type == 'custom':
        # Load custom model from stored file
        if not custom_model_path or not os.path.exists(custom_model_path):
            return jsonify({"error": "Custom model file not found."}), 500
        spec = importlib.util.spec_from_file_location("model_module", custom_model_path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        if not hasattr(mod, "grade"):
            return jsonify({"error": "Custom script must define grade(text)"}), 500
        grade_fn = mod.grade
    else:
        # Use OpenAI API for grading
        client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
        if not os.environ.get('OPENAI_API_KEY'):
            return jsonify({'error': 'OpenAI API key not set'}), 500
        def grade_fn(text: str) -> float:
            prompt = f"{ai_prompt}\nRubric: {rubric}\n Respond with only a number\nText: {text}\nGrade:"
            try:
                response = client.chat.completions.create(
                    model='gpt-4o-2024-08-06' if model_type == 'gpt-4o' else 'gpt-4.1-2025-04-14',
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=10,
                    temperature=0
                )
                pred = response.choices[0].message.content.strip()
                return float(pred)
            except Exception:
                return float('nan')

    df_preview = pd.DataFrame({"text": sample_texts})
    auditor = Auditor(model=grade_fn, data=df_preview)
    bias_df = auditor.audit([variation], [magnitude])
    moments_df = auditor.audit_moments()

    return jsonify({
        "bias_table": bias_df.to_dict(orient="records"),
        "moments_table": moments_df.to_dict(orient="records")
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000) 