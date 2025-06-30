import os
import tempfile
import importlib.util
from typing import List

from flask import (Flask, request, render_template, redirect, url_for,
                   flash, send_file)
import pandas as pd

# Hugging-Face / Torch imports (install once: pip install transformers torch)
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

from ai_bias_audit.auditor import Auditor   # ← your package

# ────────────────────────── Flask app setup ──────────────────────────
app = Flask(__name__)
app.secret_key = os.urandom(24)

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

