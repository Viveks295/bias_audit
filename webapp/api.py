from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pandas as pd
import tempfile
import os
import json
from typing import Dict, Any, List
import importlib.util
from ai_bias_audit.auditor import Auditor
from ai_bias_audit.variations import get_variation

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Global storage for audit sessions
audit_sessions = {}

@app.route('/api/variations', methods=['GET'])
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

@app.route('/api/preview', methods=['POST'])
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

@app.route('/api/audit', methods=['POST'])
def start_audit():
    """Start a new audit."""
    try:
        # Get audit state from form data
        audit_state_json = request.form.get('auditState')
        audit_state = json.loads(audit_state_json)
        
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
        
        # For now, return mock results
        # In a real implementation, you would:
        # 1. Load the data file
        # 2. Set up the model
        # 3. Run the actual audit
        # 4. Store results
        
        mock_results = [
            {
                'variation': 'spelling',
                'magnitude': 30,
                'originalGrade': 85,
                'perturbedGrade': 78,
                'difference': -7,
                'biasMeasures': {
                    'bias_0': -7,
                    'bias_1': -0.23,
                    'bias_2': -0.15,
                    'bias_3': -0.47,
                },
                'group': 'Group A',
            },
            {
                'variation': 'spanglish',
                'magnitude': 50,
                'originalGrade': 85,
                'perturbedGrade': 72,
                'difference': -13,
                'biasMeasures': {
                    'bias_0': -13,
                    'bias_1': -0.26,
                    'bias_2': -0.18,
                    'bias_3': -0.87,
                },
                'group': 'Group A',
            },
        ]
        
        audit_sessions[session_id]['results'] = mock_results
        audit_sessions[session_id]['status'] = 'completed'
        
        return jsonify({
            'sessionId': session_id,
            'status': 'completed',
            'results': mock_results,
            'summary': {
                'totalVariations': len(mock_results),
                'averageGradeChange': -10,
                'maxBiasMeasure': -0.87,
                'groupsAnalyzed': 1,
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/results/<session_id>', methods=['GET'])
def get_results(session_id):
    """Get audit results for a session."""
    if session_id not in audit_sessions:
        return jsonify({'error': 'Session not found'}), 404
    
    session_data = audit_sessions[session_id]
    
    if session_data['status'] != 'completed':
        return jsonify({'error': 'Audit not completed'}), 400
    
    results = session_data['results']
    
    # Calculate summary statistics
    total_variations = len(results)
    average_grade_change = sum(r['difference'] for r in results) / total_variations
    max_bias_measure = max(abs(r['biasMeasures']['bias_1']) for r in results)
    groups_analyzed = len(set(r.get('group', 'default') for r in results))
    
    return jsonify({
        'results': results,
        'summary': {
            'totalVariations': total_variations,
            'averageGradeChange': average_grade_change,
            'maxBiasMeasure': max_bias_measure,
            'groupsAnalyzed': groups_analyzed,
        }
    })

@app.route('/api/download/<session_id>', methods=['GET'])
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

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'healthy', 'message': 'AI Bias Audit API is running'})

if __name__ == '__main__':
    app.run(debug=True, port=5000) 