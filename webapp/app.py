import os
import tempfile
import importlib.util

from flask import Flask, request, render_template, send_file, url_for, redirect, flash
import pandas as pd

from essay_bias_audit.auditor import Auditor

app = Flask(__name__)
app.secret_key = os.urandom(24)
# Temporary workspace for uploads and outputs
WORKDIR = tempfile.mkdtemp(prefix='essay_audit_')

@app.route('/', methods=['GET', 'POST'])
def index():
    VARIATIONS = ['spelling', 'pio', 'cognates', 'noun_transfer', 'spanglish']
    if request.method == 'POST':
        # Validate inputs
        data_file = request.files.get('data')
        model_file = request.files.get('model')
        model_func = request.form.get('model_func', 'grade')
        variations = request.form.getlist('variations')
        magnitudes_text = request.form.get('magnitudes', '')
        if not data_file or not model_file or not variations or not magnitudes_text:
            flash('All fields are required, and at least one variation must be selected.')
            return redirect(url_for('index'))
        try:
            magnitudes = [int(x.strip()) for x in magnitudes_text.split(',')]
        except ValueError:
            flash('Magnitudes must be comma-separated integers.')
            return redirect(url_for('index'))
        if len(magnitudes) != len(variations):
            flash('Number of magnitudes must match number of variations.')
            return redirect(url_for('index'))
        # Save uploaded files
        data_path = os.path.join(WORKDIR, 'data.csv')
        model_path = os.path.join(WORKDIR, 'model.py')
        data_file.save(data_path)
        model_file.save(model_path)
        # Load data
        df = pd.read_csv(data_path)
        # Import model dynamically
        spec = importlib.util.spec_from_file_location('model_module', model_path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        if not hasattr(mod, model_func):
            flash(f"Function '{model_func}' not found in model script.")
            return redirect(url_for('index'))
        model = getattr(mod, model_func)
        # Run audit
        auditor = Auditor(model=model, data=df)
        report = auditor.audit(variations, magnitudes)
        # Save report for download
        report_path = os.path.join(WORKDIR, 'audit_report.csv')
        report.to_csv(report_path, index=False)
        # Render results
        table_html = report.to_html(classes='table table-bordered', index=False)
        return render_template('results.html', table_html=table_html)
    return render_template('index.html', variations=VARIATIONS)

@app.route('/download')
def download():
    report_path = os.path.join(WORKDIR, 'audit_report.csv')
    if not os.path.exists(report_path):
        flash('No report available for download.')
        return redirect(url_for('index'))
    return send_file(report_path, as_attachment=True, download_name='audit_report.csv')

if __name__ == '__main__':
    app.run(debug=True)