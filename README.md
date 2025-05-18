# AI Bias Audit

A Python package to audit bias in AI grading models. It allows users to grade essays with their model, apply
text variations (e.g., spelling errors, noun transfer), and analyze how these variations affect model grading.

## Installation

```bash
pip install .
```

This package declares NLTK as a dependency (for tokenization and POS tagging); `pip install .` will install `nltk`, but you must download its language models:
```bash
python - <<EOF
import nltk
nltk.download('punkt')
nltk.download('averaged_perceptron_tagger')
EOF
```

## Usage

```python
import pandas as pd
from essay_bias_audit.auditor import Auditor

# Load data
df = pd.read_csv('essays.csv')

# Define grading model: function taking (text) and returning grade
def my_model(text):
    # model code here
    return ...

# Create auditor and grade original texts
auditor = Auditor(model=my_model, data=df)
original_grades = auditor.grade()
print('Accuracy:', auditor.accuracy())

# Audit bias
variations = ['spelling', 'spanglish']
magnitudes = [30, 50]
report = auditor.audit(variations, magnitudes)
print(report.head())
```

## Preview Variations

Before running a full audit, you can preview a few samples of how a variation affects your text:

```python
# Preview a few samples of perturbed essays for the 'spelling' variation
samples = auditor.preview_variation(
    variation_name='spelling',
    magnitude=30,
    n_samples=5,
    random_state=42,
)
print(samples)
```

## CLI

```bash
essay-bias-audit --data essays.csv --model-script model.py --model-func grade \
  --variations spelling --magnitudes 30 \
  --variations spanglish --magnitudes 50 \
  --output audit_results.csv
```

## Web Interface

We provide a minimal Flask web app under the `webapp/` directory. To run:
```bash
# 1. Install your package in editable mode (from project root)
pip install -e .
# 2. Install webapp dependencies
cd webapp
pip install -r requirements.txt
# 3. Run the Flask app
python app.py
```
Then visit http://127.0.0.1:5000 in your browser, upload your CSV and model, select variations and magnitudes, and view or download the audit results.
