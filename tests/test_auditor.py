import pandas as pd
import pytest
import nltk
import random
import numpy as np
# Stub NLTK to avoid needing external data
nltk.word_tokenize = lambda text: text.split()
nltk.pos_tag = lambda tokens: [(w, 'NN') for w in tokens]
nltk.sent_tokenize = lambda text: [text]
from ai_bias_audit.auditor import Auditor
from ai_bias_audit.variations import get_variation

@pytest.fixture
def df():
    return pd.DataFrame({
        'prompt': ['Q1', 'Q2'],
        'text': ['abc', 'def'],
        'true_grade': [3, 3],
    })

def dummy_model(text):
    # Simple model: grade = length of text
    return len(text)

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
    # Should return a DataFrame with 'text' column
    assert isinstance(pert_df, pd.DataFrame)
    assert 'text' in pert_df.columns
    # Run full audit
    report = aud.audit([varname], [50])
    assert 'bias_0' in report.columns
    # Should have one row per text
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
    expected_cols = {'index', 'prompt', 'original_text', 'perturbed_text'}
    assert set(samples.columns) == expected_cols
    # Each perturbed text should be the reverse of the original
    for _, row in samples.iterrows():
        assert row['perturbed_text'] == row['original_text'][::-1]

def test_grade(auditor):
    df = auditor.grade()
    assert 'predicted_grade' in df.columns
    assert len(df) == 3


def test_score_cutoff(auditor):
    # Only rows with original grade >= 1 should be included
    result = auditor.audit(['spelling'], [10], score_cutoff=1)
    result = result.reset_index(drop=True)
    if result.empty:
        assert False, 'Result should not be empty for cutoff=1 with grades [1,0,1]'
    else:
        assert all(result['original_grade'] >= 1)
        assert set(result['original_grade']) == {1}


def test_audit_output_columns(auditor):
    result = auditor.audit(['spelling'], [10])
    expected_cols = {'index', 'variation', 'magnitude', 'original_grade', 'perturbed_grade', 'bias_0'}
    assert expected_cols.issubset(result.columns)

def test_bias_measures_present(auditor):
    result = auditor.audit(['spelling', 'cognates', 'noun_transfer', 'spanglish'], [10, 10, 10, 10])
    for col in ['bias_0', 'bias_1', 'bias_2', 'bias_3']:
        assert col in result.columns
        # All values should be finite (not inf or nan)
        assert result[col].apply(lambda x: x == x and x != float('inf') and x != float('-inf')).all()

def test_audit_moments(auditor):
    auditor.audit(['spelling', 'cognates'], [10, 10])
    moments = auditor.audit_moments()
    # Check that the DataFrame has the correct columns
    for col in ['bias_0_mean', 'bias_0_var', 'bias_0_skew',
                'bias_1_mean', 'bias_1_var', 'bias_1_skew',
                'bias_2_mean', 'bias_2_var', 'bias_2_skew',
                'bias_3_mean', 'bias_3_var', 'bias_3_skew']:
        assert col in moments.columns
    # Should have one row per (variation, magnitude)
    assert set(moments['variation']) == {'spelling', 'cognates'}
    assert set(moments['magnitude']) == {10}

def test_group_variable_analysis():
    # Create sample data with a group column
    df = pd.DataFrame({
        'text': ['foo', 'bar', 'baz', 'qux'],
        'true_grade': [1, 0, 1, 0],
        'group': ['A', 'A', 'B', 'B']
    })
    auditor = Auditor(model=lambda text: 1 if 'a' in text else 0, data=df)
    result = auditor.audit(['spelling'], [10], group_col='group')
    assert 'group' in result.columns
    assert set(result['group']) == {'A', 'B'}
    moments = auditor.audit_moments(group_col='group')
    assert 'group' in moments.columns
    assert set(moments['group']) == {'A', 'B'}
