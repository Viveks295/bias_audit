import os
import tempfile
import importlib.util
from typing import List

from flask import (Flask, request, render_template, redirect, url_for,
                   flash, send_file, session)
import pandas as pd
import pickle
from werkzeug.utils import secure_filename

# Hugging-Face / Torch imports (install once: pip install transformers torch)
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

from ai_bias_audit.auditor import Auditor   # ← your package
from webapp.api import api
from flask_cors import CORS

# ────────────────────────── Flask app setup ──────────────────────────
app = Flask(__name__)
app.secret_key = os.urandom(24)
CORS(app)
app.register_blueprint(api)

WORKDIR     = tempfile.mkdtemp(prefix="essay_audit_")
DATA_PATH   = os.path.join(WORKDIR, "data.csv")
MODEL_PATH  = os.path.join(WORKDIR, "model.py")

DISPLAY_NAMES = {
    "spelling":       "Spelling Errors",
    "pio":            "Phonetically Influenced Orthography",
    "cognates":       "Cognate Replacement",
    "noun_transfer":  "Noun Transfer",
    "spanglish":      "Spanglish",
}



# ────────────────────────── utility helpers ──────────────────────────
def _save_upload(file_storage, path):
    """Save an uploaded FileStorage only if provided."""
    if file_storage:
        file_storage.save(path)


def _make_auditor(model_choice: str = "custom",
                  ai_prompt: str = "",
                  rubric: str = "") -> Auditor:
    """
    Build an Auditor instance given the chosen model source.

    model_choice : "custom"  → import grade() from MODEL_PATH
                 : HF id     → wrap checkpoint in grade_fn
    ai_prompt    : required when model_choice != "custom"
    rubric       : optional extra text appended to the prompt
    """
    # ─── read text CSV (must have 'text') ──────────────────────────
    df = pd.read_csv(DATA_PATH)
    if "text" not in df.columns:
        raise ValueError("CSV must contain an 'text' column")

    if model_choice == "custom":
        # dynamic import of user script
        spec = importlib.util.spec_from_file_location("model_module",
                                                      MODEL_PATH)
        mod  = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        if not hasattr(mod, "grade"):
            raise AttributeError("Custom script must define grade(text)")
        grade_fn = mod.grade

    else:
        # preset HF checkpoint
        tokenizer = AutoTokenizer.from_pretrained(model_choice)
        model     = AutoModelForSequenceClassification.from_pretrained(
                        model_choice)
        model.eval()

        def grade_fn(text: str) -> float:
            text = f"{ai_prompt.strip()}\n\n{text.strip()}"
            if rubric.strip():
                text += f"\n\nRubric:\n{rubric.strip()}"
            inp = tokenizer(text, return_tensors="pt",
                            truncation=True, padding=True)
            with torch.no_grad():
                logits = model(**inp).logits
            # prob of positive class (index 1) as scalar score
            prob = torch.softmax(logits, dim=-1)[0, 1].item()
            return prob

    return Auditor(model=grade_fn, data=df)


def _summarise_and_render(report: pd.DataFrame,
                          variations: List[str],
                          magnitudes: List[int]):
    """Render the results.html template with chart + table."""
    # save entire CSV for download
    report_path = os.path.join(WORKDIR, "audit_report.csv")
    report.to_csv(report_path, index=False)

    summary = (report.groupby("variation", as_index=False)["difference"]
                      .mean()
                      .rename(columns={"difference": "bias"}))

    table_html = summary.to_html(
        classes=("min-w-full bg-white divide-y divide-gray-200 divide-x "
                 "text-sm text-gray-700"),
        index=False, border=0)

    labels = summary["variation"].tolist()
    values = summary["bias"].round(2).tolist()

    return render_template("results.html",
                           table_html=table_html,
                           labels=labels,
                           values=values)


# ────────────────────────── routes ──────────────────────────
@app.route("/", methods=["GET"])
def index():
    return render_template("index.html",
                           variations=list(DISPLAY_NAMES.keys()),
                           display_names=DISPLAY_NAMES)


@app.route("/", methods=["POST"])
def run_from_index():
    """Run audit directly (skip preview)."""
    return _handle_submission(skip_preview=True)


@app.route("/preview", methods=["POST"])
def preview():
    """Show perturbed sample tables, then allow user to run audit."""
    return _handle_submission(skip_preview=False)


@app.route("/run", methods=["POST"])
def run_after_preview():
    """Final audit after the preview step."""
    variations   = request.form.getlist("variations")
    magnitudes   = [int(x) for x in request.form.getlist("magnitudes")]

    model_choice = request.form.get("model_choice", "custom")
    ai_prompt    = request.form.get("ai_prompt", "")
    rubric       = request.form.get("rubric", "")

    auditor = _make_auditor(model_choice, ai_prompt, rubric)
    report  = auditor.audit(variations, magnitudes)
    return _summarise_and_render(report, variations, magnitudes)


@app.route("/download")
def download():
    path = os.path.join(WORKDIR, "audit_report.csv")
    if not os.path.exists(path):
        flash("No report available for download.")
        return redirect(url_for("index"))
    return send_file(path, as_attachment=True,
                     download_name="audit_report.csv")


@app.route("/about")
def about():
    return render_template("about.html")


@app.route('/upload', methods=['GET', 'POST'])
def upload():
    if request.method == 'POST':
        if 'file' not in request.files:
            flash('No file part')
            return render_template('upload.html')
        file = request.files['file']
        if file.filename == '':
            flash('No selected file')
            return render_template('upload.html')
        if file:
            filename = secure_filename(file.filename)
            try:
                df = pd.read_csv(file)
            except Exception as e:
                flash(f'Error reading CSV: {e}')
                return render_template('upload.html')
            if 'text' not in df.columns:
                flash("CSV must contain a 'text' column.")
                return render_template('upload.html')
            # Save DataFrame to a temp file
            temp = tempfile.NamedTemporaryFile(delete=False, suffix='.pkl')
            pickle.dump(df, temp)
            temp.close()
            session['data_file'] = temp.name
            return redirect(url_for('llm_audit'))
    return render_template('upload.html')


@app.route('/llm_audit', methods=['GET', 'POST'])
def llm_audit():
    if request.method == 'POST':
        choice = request.form.get('llm_audit')
        if choice not in ['yes', 'no']:
            flash('Please select Yes or No.')
            return render_template('llm_audit.html')
        session['llm_audit'] = choice
        if choice == 'no':
            return redirect(url_for('no_audit'))
        else:
            return redirect(url_for('choose_llm'))
    return render_template('llm_audit.html')


# Placeholder for /no_audit route
@app.route('/no_audit')
def no_audit():
    return render_template('no_audit.html')


@app.route('/choose_llm', methods=['GET', 'POST'])
def choose_llm():
    predefined_llms = ['GPT-3.5', 'GPT-4', 'Llama-2', 'Custom']
    if request.method == 'POST':
        llm_choice = request.form.get('llm_choice')
        custom_llm = request.form.get('custom_llm', '').strip()
        if llm_choice not in predefined_llms:
            flash('Please select a valid LLM.')
            return render_template('choose_llm.html', predefined_llms=predefined_llms)
        if llm_choice == 'Custom' and not custom_llm:
            flash('Please specify your custom model.')
            return render_template('choose_llm.html', predefined_llms=predefined_llms)
        session['llm_choice'] = llm_choice
        session['custom_llm'] = custom_llm if llm_choice == 'Custom' else ''
        return redirect(url_for('choose_metric'))
    return render_template('choose_llm.html', predefined_llms=predefined_llms)


@app.route('/choose_metric', methods=['GET', 'POST'])
def choose_metric():
    predefined_metrics = ['Accuracy', 'F1 Score', 'Mean Squared Error', 'AUC']
    if request.method == 'POST':
        metric_choice = request.form.get('metric_choice')
        if metric_choice not in predefined_metrics:
            flash('Please select a valid performance metric.')
            return render_template('choose_metric.html', predefined_metrics=predefined_metrics)
        session['metric_choice'] = metric_choice
        return redirect(url_for('choose_variable_type'))
    return render_template('choose_metric.html', predefined_metrics=predefined_metrics)


@app.route('/choose_variable_type', methods=['GET', 'POST'])
def choose_variable_type():
    variable_types = ['Binary', 'Continuous']
    if request.method == 'POST':
        variable_type = request.form.get('variable_type')
        if variable_type not in variable_types:
            flash('Please select a valid variable type.')
            return render_template('choose_variable_type.html', variable_types=variable_types)
        session['variable_type'] = variable_type
        return redirect(url_for('batch_score_filter'))
    return render_template('choose_variable_type.html', variable_types=variable_types)


@app.route('/batch_score_filter', methods=['GET', 'POST'])
def batch_score_filter():
    if request.method == 'POST':
        filter_enabled = request.form.get('batch_score_filter') == 'on'
        threshold = request.form.get('batch_score_threshold')
        if filter_enabled:
            try:
                threshold_val = float(threshold)
            except (TypeError, ValueError):
                flash('Please enter a valid batch score threshold.')
                return render_template('batch_score_filter.html', filter_enabled=filter_enabled, threshold=threshold)
            session['batch_score_filter'] = True
            session['batch_score_threshold'] = threshold_val
        else:
            session['batch_score_filter'] = False
            session['batch_score_threshold'] = None
        return redirect(url_for('choose_variation'))
    return render_template('batch_score_filter.html', filter_enabled=False, threshold='')


@app.route('/choose_variation', methods=['GET', 'POST'])
def choose_variation():
    available_variations = ['spelling', 'spanglish', 'noun_transfer', 'cognates']
    if request.method == 'POST':
        selected = request.form.getlist('variations')
        if not selected:
            flash('Please select at least one variation.')
            return render_template('choose_variation.html', available_variations=available_variations, selected=selected)
        session['variations'] = selected
        return redirect(url_for('preview_variation'))
    return render_template('choose_variation.html', available_variations=available_variations, selected=[])


@app.route('/preview_variation', methods=['GET', 'POST'])
def preview_variation():
    from ai_bias_audit.auditor import Auditor
    import pickle
    import os
    if request.method == 'POST':
        valid = request.form.get('samples_valid')
        if valid == 'no':
            return redirect(url_for('choose_variation'))
        elif valid == 'yes':
            return redirect(url_for('choose_group'))
        else:
            flash('Please confirm if the samples are valid.')
    # GET: generate previews
    data_file = session.get('data_file')
    variations = session.get('variations', [])
    if not data_file or not os.path.exists(data_file):
        flash('Data file not found. Please upload your data again.')
        return redirect(url_for('upload'))
    if not variations:
        flash('No variations selected. Please select at least one variation.')
        return redirect(url_for('choose_variation'))
    with open(data_file, 'rb') as f:
        df = pickle.load(f)
    # Use a dummy model for preview (echoes text length)
    def dummy_model(text):
        return len(text)
    auditor = Auditor(dummy_model, df)
    previews = []
    for var in variations:
        try:
            preview_df = auditor.preview_variation(var, magnitude=50, n_samples=5, random_state=42)
            previews.append({
                'variation': var,
                'samples': preview_df.to_dict(orient='records')
            })
        except Exception as e:
            previews.append({
                'variation': var,
                'samples': [],
                'error': str(e)
            })
    return render_template('preview_variation.html', previews=previews)


@app.route('/choose_group', methods=['GET', 'POST'])
def choose_group():
    import pickle
    import os
    data_file = session.get('data_file')
    if not data_file or not os.path.exists(data_file):
        flash('Data file not found. Please upload your data again.')
        return redirect(url_for('upload'))
    with open(data_file, 'rb') as f:
        df = pickle.load(f)
    exclude_cols = {'text', 'true_grade', 'num_words', 'num_nouns', 'num_cognates'}
    group_cols = [col for col in df.columns if col not in exclude_cols]
    if request.method == 'POST':
        group_col = request.form.get('group_col')
        if group_col not in group_cols and group_col != '':
            flash('Please select a valid group column or leave blank.')
            return render_template('choose_group.html', group_cols=group_cols, selected=group_col)
        session['group_col'] = group_col
        return redirect(url_for('choose_measures'))
    return render_template('choose_group.html', group_cols=group_cols, selected='')


@app.route('/choose_measures', methods=['GET', 'POST'])
def choose_measures():
    bias_measures = ['bias_0', 'bias_1', 'bias_2', 'bias_3']
    moments = ['mean', 'variance', 'skewness']
    available_measures = [f'{b}_{m}' for b in bias_measures for m in moments]
    if request.method == 'POST':
        selected = request.form.getlist('measures')
        if not selected:
            flash('Please select at least one measure/moment.')
            return render_template('choose_measures.html', available_measures=available_measures, selected=selected)
        session['measures'] = selected
        return redirect(url_for('audit_results'))
    return render_template('choose_measures.html', available_measures=available_measures, selected=[])


# ────────────────────────── shared form-handler ──────────────────────────
def _handle_submission(skip_preview: bool):
    """
    Common logic for /
        POST (skip_preview=True)  → run audit immediately
        POST to /preview          → show sample tables first
    """
    # 1) Grab form fields ---------------------------------------------------
    data_file    = request.files.get("data")
    model_file   = request.files.get("model")

    model_choice = request.form.get("model_choice", "custom")
    ai_prompt    = request.form.get("ai_prompt", "")
    rubric       = request.form.get("rubric", "")

    variations   = request.form.getlist("variations")
    magnitudes_r = request.form.getlist("magnitudes")

    # 2) Validation ---------------------------------------------------------
    if not data_file or not variations or not magnitudes_r:
        flash("Please complete all required fields.")
        return redirect(url_for("index"))

    if model_choice == "custom" and not model_file:
        flash("Upload a grading script or choose a Hugging Face model.")
        return redirect(url_for("index"))

    if model_choice != "custom" and not ai_prompt.strip():
        flash("AI model prompt is required for Hugging Face models.")
        return redirect(url_for("index"))

    try:
        magnitudes = [int(x) for x in magnitudes_r]
    except ValueError:
        flash("Magnitudes must be integers.")
        return redirect(url_for("index"))

    if len(magnitudes) != len(variations):
        flash("Number of magnitudes must match number of variations.")
        return redirect(url_for("index"))

    # 3) Save uploads -------------------------------------------------------
    _save_upload(data_file, DATA_PATH)
    # only save custom script
    if model_choice == "custom":
        _save_upload(model_file, MODEL_PATH)

    # 4) If skipping preview → run audit now -------------------------------
    if skip_preview:
        auditor = _make_auditor(model_choice, ai_prompt, rubric)
        report  = auditor.audit(variations, magnitudes)
        return _summarise_and_render(report, variations, magnitudes)

    # 5) Otherwise build preview tables ------------------------------------
    preview_vars     = request.form.getlist("preview_variations")
    auditor          = _make_auditor(model_choice, ai_prompt, rubric)
    mag_map          = dict(zip(variations, magnitudes))

    previews = []
    for var in preview_vars:
        n_samples = int(request.form.get(f"samples_{var}", 5))
        df_prev   = auditor.preview_variation(
            variation_name=var,
            magnitude     =mag_map[var],
            n_samples     =n_samples,
            random_state  =42,
        )
        previews.append({
            "variation"  : var,
            "magnitude"  : mag_map[var],
            "n_samples"  : n_samples,
            "table_html" : df_prev.to_html(
                classes="min-w-full text-sm text-gray-700",
                index=False, border=0)
        })

    # Pass everything forward so /run can finish the job
    return render_template("preview.html",
                           previews     = previews,
                           variations   = variations,
                           magnitudes   = magnitudes,
                           model_choice = model_choice,
                           ai_prompt    = ai_prompt,
                           rubric       = rubric)


# ────────────────────────── main ──────────────────────────
if __name__ == "__main__":
    # Ensure Torch does not hog CUDA when deployed on CPU-only host
    os.environ.setdefault("CUDA_VISIBLE_DEVICES", "")
    app.run(debug=True)

