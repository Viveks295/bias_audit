import pandas as pd
import pytest
import nltk
# Stub NLTK to avoid needing external data
nltk.word_tokenize = lambda text: text.split()
nltk.pos_tag = lambda tokens: [(w, 'NN') for w in tokens]
nltk.sent_tokenize = lambda text: [text]
from essay_bias_audit.auditor import Auditor
from essay_bias_audit.variations import get_variation

@pytest.fixture
def df():
    return pd.DataFrame({
        'prompt': ['Q1', 'Q2'],
        'essay': ['abc', 'def'],
        'true_grade': [3, 3],
    })

def dummy_model(prompt, essay):
    # Simple model: grade = length of essay
    return len(essay)

def test_grade_and_accuracy(df):
    aud = Auditor(dummy_model, df)
    scored = aud.grade()
    assert 'predicted_grade' in scored.columns
    # 'abc' and 'def' both length 3
    assert scored['predicted_grade'].tolist() == [3, 3]
    assert aud.accuracy() == 1.0

@pytest.mark.parametrize('varname', ['spelling', 'pio', 'cognates', 'noun_transfer', 'spanglish'])
def test_perturb_and_audit(monkeypatch, df, varname):
    variation = get_variation(varname)
    # Stub out translation functions for deterministic output
    if hasattr(variation, 'translate_word'):
        monkeypatch.setattr(variation, 'translate_word', lambda w: w.upper())
    if hasattr(variation, 'translate_phrase'):
        monkeypatch.setattr(variation, 'translate_phrase', lambda p: p.upper())
    aud = Auditor(dummy_model, df)
    pert_df = aud.perturb(varname, magnitude=50)
    # Should return a DataFrame with 'essay' column
    assert isinstance(pert_df, pd.DataFrame)
    assert 'essay' in pert_df.columns
    # Run full audit
    report = aud.audit([varname], [50])
    assert 'difference' in report.columns
    # Should have one row per essay
    assert len(report) == len(df)
    
def test_preview_variation(monkeypatch, df):
    # Stub the 'spelling' variation to apply a simple reversible transform (reverse text)
    variation = get_variation('spelling')
    monkeypatch.setattr(variation, 'apply', lambda text, magnitude: text[::-1])
    aud = Auditor(dummy_model, df)
    # Preview two samples with a fixed random state for reproducibility
    samples = aud.preview_variation('spelling', magnitude=50, n_samples=2, random_state=0)
    # Should return a DataFrame with expected columns
    assert isinstance(samples, pd.DataFrame)
    expected_cols = {'index', 'prompt', 'original_essay', 'perturbed_essay'}
    assert set(samples.columns) == expected_cols
    # Each perturbed essay should be the reverse of the original
    for _, row in samples.iterrows():
        assert row['perturbed_essay'] == row['original_essay'][::-1]
