# essay_bias_audit

A Python package to audit bias in essay grading models. It allows users to grade essays with their model, apply
text variations (e.g., spelling errors, code-switching), and analyze how these variations affect model grading.

## Installation

```bash
pip install .
```

## Usage

```python
import pandas as pd
from essay_bias_audit.auditor import Auditor

# Load data
df = pd.read_csv('essays.csv')

# Define grading model: function taking (prompt, essay) and returning grade
def my_model(prompt, essay):
    # model code here
    return ...

# Create auditor and grade original essays
auditor = Auditor(model=my_model, data=df)
original_grades = auditor.grade()
print('Accuracy:', auditor.accuracy())

# Audit bias
variations = ['spelling', 'spanglish']
magnitudes = [30, 50]
report = auditor.audit(variations, magnitudes)
print(report.head())
```

## CLI

```bash
essay-bias-audit --data essays.csv --model-script model.py --model-func grade \
  --variations spelling --magnitudes 30 \
  --variations spanglish --magnitudes 50 \
  --output audit_results.csv
```  