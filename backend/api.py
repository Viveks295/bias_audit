from flask import Flask, request, jsonify, send_file, Blueprint
from flask_cors import CORS
import pandas as pd
import tempfile
import os
import json
import traceback
import math
from typing import Dict, Any, List
import importlib.util
import os
from openai import OpenAI
from ai_bias_audit.auditor import Auditor
from ai_bias_audit.variations import get_variation
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

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

def build_gpt_prompt(ai_prompt, rubric, text):
    prompt = f"{ai_prompt}\n"
    if rubric and rubric.strip():
        prompt += f"Rubric: {rubric}\n"
    prompt += f"Respond with only a number\nText: {text}\nGrade:"
    return prompt

def make_grade_fn(model_type, ai_prompt, rubric, custom_model_path=None):
    if model_type == 'custom':
        if not custom_model_path or not os.path.exists(custom_model_path):
            raise RuntimeError("Custom model file not found.")
        spec = importlib.util.spec_from_file_location("model_module", custom_model_path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        if not hasattr(mod, "grade"):
            raise RuntimeError("Custom script must define grade(text)")
        return mod.grade
    else:
        client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
        if not os.environ.get('OPENAI_API_KEY'):
            raise RuntimeError("OpenAI API key not set")
        def grade_fn(text: str) -> float:
            prompt = build_gpt_prompt(ai_prompt, rubric, text)
            max_retries = 5
            
            for attempt in range(max_retries):
                try:
                    response = client.chat.completions.create(
                        model='gpt-4o-2024-08-06' if model_type == 'gpt-4o' else 'gpt-4.1-2025-04-14',
                        messages=[{"role": "user", "content": prompt}],
                        max_tokens=10,
                        temperature=0
                    )
                    pred = response.choices[0].message.content.strip()
                    # Try to convert to float
                    grade = float(pred)
                    return grade
                except (ValueError, TypeError):
                    # If conversion fails, try again (up to max_retries)
                    if attempt == max_retries - 1:
                        # On final attempt, return 0 instead of NaN
                        return 0.0
                    continue
                except Exception:
                    # For other exceptions (API errors, etc.), return 0 on final attempt
                    if attempt == max_retries - 1:
                        return 0.0
                    continue
            
            # This should never be reached, but just in case
            return 0.0
        return grade_fn
    

@api.route('/api/variations', methods=['GET'])
def get_variations():
    """Get available variations."""
    variations = {
        'spelling': {
            'id': 'spelling',
            'name': 'Spelling Errors',
            'description': 'Introduce spelling mistakes in the text',
            'magnitudeRange': [0, 100],
            'defaultMagnitude': 50,
        },
        'spanglish': {
            'id': 'spanglish',
            'name': 'Spanglish',
            'description': 'Mix Spanish and English words',
            'magnitudeRange': [0, 100],
            'defaultMagnitude': 50,
        },
        'noun_transfer': {
            'id': 'noun_transfer',
            'name': 'Noun Transfer',
            'description': 'Replace nouns with similar ones',
            'magnitudeRange': [0, 100],
            'defaultMagnitude': 50,
        },
        'cognates': {
            'id': 'cognates',
            'name': 'Cognates',
            'description': 'Use cognate words from other languages',
            'magnitudeRange': [0, 100],
            'defaultMagnitude': 50,
        },
        'pio': {
            'id': 'pio',
            'name': 'PIO (Part-of-Speech)',
            'description': 'Modify part-of-speech patterns',
            'magnitudeRange': [0, 100],
            'defaultMagnitude': 50,
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
        model_type = audit_state.get('selectedLLM', {}).get('id', 'custom')
        ai_prompt = audit_state.get('aiPrompt', '')
        rubric = audit_state.get('rubric', '')
        
        if model_type == 'custom':
            if not model_script:
                return jsonify({"error": "Custom model file required"}), 400
            temp_dir = tempfile.mkdtemp(prefix="custom_model_")
            model_path = os.path.join(temp_dir, model_script.filename)
            model_script.save(model_path)
            try:
                grade_fn = make_grade_fn(model_type, ai_prompt, rubric, model_path)
            except Exception as e:
                return jsonify({"error": str(e)}), 500
        else:
            try:
                grade_fn = make_grade_fn(model_type, ai_prompt, rubric)
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
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
        
        # Create auditor and run audit
        auditor = Auditor(model=grade_fn, data=df)
        bias_df = auditor.audit(variations, magnitudes, score_cutoff=score_cutoff, group_col=group_col)
        
        # Calculate moments during the initial audit
        moments = []
        try:
            moments_df = auditor.audit_moments(group_col=group_col)
            moments = moments_df.to_dict(orient="records")
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
            # Handle NaN values by converting them to 0.0
            def safe_float(value):
                try:
                    float_val = float(value)
                    return 0.0 if math.isnan(float_val) else float_val
                except (ValueError, TypeError):
                    return 0.0
            
            result = {
                'variation': row['variation'],
                'magnitude': row['magnitude'],
                'originalGrade': safe_float(row['original_grade']),
                'perturbedGrade': safe_float(row['perturbed_grade']),
                'biasMeasures': {
                    'bias_0': safe_float(row['bias_0']),
                    'bias_1': safe_float(row['bias_1']),
                    'bias_2': safe_float(row['bias_2']),
                    'bias_3': safe_float(row['bias_3']),
                },
                'original_text': row.get('original_text', ''),
                'perturbed_text': row.get('perturbed_text', ''),
            }
            if 'group' in row:
                result['group'] = str(row['group'])
            results.append(result)
        
        # Calculate summary statistics
        total_variations = len(set(r['variation'] for r in results))
        average_grade_change = sum(r['biasMeasures']['bias_0'] for r in results) / len(results)
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
        total_variations = len(set(r['variation'] for r in results))
        average_grade_change = sum(r['biasMeasures']['bias_0'] for r in results) / total_variations
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

    # Determine if grouping was used (any result has a non-empty 'group' field)
    grouping_used = any('group' in r and r['group'] not in (None, '', 'default', 'unknown') for r in results)

    # Create CSV content with or without Group column
    if grouping_used:
        csv_content = "Variation,Magnitude,Original Text,Perturbed Text,Original Grade,Perturbed Grade,Bias_0,Bias_1,Bias_2,Bias_3,Group\n"
    else:
        csv_content = "Variation,Magnitude,Original Text,Perturbed Text,Original Grade,Perturbed Grade,Bias_0,Bias_1,Bias_2,Bias_3\n"

    for result in results:
        original_text = result.get('original_text', '')
        perturbed_text = result.get('perturbed_text', '')
        row = f"{result['variation']},{result['magnitude']},\"{original_text}\",\"{perturbed_text}\",{result['originalGrade']},{result['perturbedGrade']},{result['biasMeasures']['bias_0']},{result['biasMeasures']['bias_1']},{result['biasMeasures']['bias_2']},{result['biasMeasures']['bias_3']}"
        if grouping_used:
            row += f",{result.get('group', '')}"
        row += "\n"
        csv_content += row
    
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
        model_path = session_data['custom_model_path']
        if not model_path or not os.path.exists(model_path):
            return jsonify({'error': 'Custom model file not found'}), 500
        try:
            grade_fn = make_grade_fn(model_type, ai_prompt, rubric, model_path)
        except Exception as e:
            return jsonify({'error': f'Error loading custom model: {str(e)}'}), 500
        for _, row in sample_df.iterrows():
            text = row['text']
            pred = grade_fn(text)
            pred_grades.append(pred)
            true = row['true_grade'] if 'true_grade' in row else None
            if true is not None:
                true_grades.append(true)
            results.append({'text': text, 'predicted_grade': pred, 'true_grade': true})
    else:
        try:
            grade_fn = make_grade_fn(model_type, ai_prompt, rubric)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        for _, row in sample_df.iterrows():
            text = row['text']
            pred = grade_fn(text)
            pred_grades.append(pred)
            true = row['true_grade'] if 'true_grade' in row else None
            if true is not None:
                true_grades.append(true)
            results.append({'text': text, 'predicted_grade': pred, 'true_grade': true})

    # Compute metric if possible
    metric_value = None
    if true_grades and metric:
        try:
            def safe_float(value):
                try:
                    float_val = float(value)
                    return 0.0 if math.isnan(float_val) else float_val
                except (ValueError, TypeError):
                    return 0.0
            
            y_true = [safe_float(x) for x in true_grades]
            y_pred = [safe_float(x) for x in pred_grades]
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
            elif metric in ('precision', 'recall', 'f1'):
                # Convert to binary 0/1
                y_true_bin = [1 if float(x) >= 0.5 else 0 for x in y_true]
                y_pred_bin = [1 if float(x) >= 0.5 else 0 for x in y_pred]
                tp = sum(1 for yt, yp in zip(y_true_bin, y_pred_bin) if yt == 1 and yp == 1)
                fp = sum(1 for yt, yp in zip(y_true_bin, y_pred_bin) if yt == 0 and yp == 1)
                fn = sum(1 for yt, yp in zip(y_true_bin, y_pred_bin) if yt == 1 and yp == 0)
                if metric == 'precision':
                    metric_value = tp / (tp + fp) if (tp + fp) > 0 else None
                elif metric == 'recall':
                    metric_value = tp / (tp + fn) if (tp + fn) > 0 else None
                elif metric == 'f1':
                    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
                    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
                    metric_value = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else None
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

    if not session_id or not sample_texts or not variation:
        return jsonify({"error": "Missing required fields."}), 400
    if len(sample_texts) != 5:
        return jsonify({"error": "Must provide 5 sample texts."}), 400

    # Use csv_storage for preview steps
    session_data = csv_storage.get(session_id)
    if session_data is None:
        return jsonify({"error": "Session not found."}), 404

    # Reconstruct the real model using stored model info
    model_type = session_data['model_type']
    ai_prompt = session_data['ai_prompt']
    rubric = session_data['rubric']
    custom_model_path = session_data['custom_model_path']

    if model_type == 'custom':
        try:
            grade_fn = make_grade_fn(model_type, ai_prompt, rubric, custom_model_path)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        try:
            grade_fn = make_grade_fn(model_type, ai_prompt, rubric)
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    df_preview = pd.DataFrame({"text": sample_texts})
    auditor = Auditor(model=grade_fn, data=df_preview)
    bias_df = auditor.audit([variation], [magnitude])
    moments_df = auditor.audit_moments()

    return jsonify({
        "bias_table": bias_df.to_dict(orient="records"),
        "moments_table": moments_df.to_dict(orient="records")
    })

@api.route('/api/create_session', methods=['POST'])
def create_session():
    """Create a session for uploaded CSV and model info, without running assessment."""
    csv_file = request.files.get('csv_file')
    model_type = request.form.get('model_type')
    ai_prompt = request.form.get('ai_prompt')
    rubric = request.form.get('rubric')
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
        temp_dir = tempfile.mkdtemp(prefix="custom_model_")
        model_path = os.path.join(temp_dir, custom_model_file.filename)
        custom_model_file.save(model_path)
        session_data['custom_model_path'] = model_path

    csv_storage[session_id] = session_data

    return jsonify({'session_id': session_id})

# This file should not be run directly - use app.py instead 