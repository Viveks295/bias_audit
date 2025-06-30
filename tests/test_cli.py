import pandas as pd
import pytest
from click.testing import CliRunner
from ai_bias_audit.cli import main
import subprocess
import tempfile
import os
import sys
import shutil

import nltk
# Stub NLTK to avoid external data downloads
nltk.word_tokenize = lambda text: text.split()
nltk.pos_tag = lambda tokens: [(w, 'NN') for w in tokens]
nltk.sent_tokenize = lambda text: [text]
import ai_bias_audit.variations.cognates as cognates_mod
import ai_bias_audit.variations.noun_transfer as noun_mod
import ai_bias_audit.variations.spanglish as spang_mod

class DummyTranslator:
    def translate(self, text):
        return text  # identity

# Monkey-patch translators to avoid HTTP calls
for mod in (cognates_mod, noun_mod, spang_mod):
    mod.translator = DummyTranslator()

@pytest.mark.parametrize('variation,magnitude', [
    ('spelling', 10),
    ('pio', 20),
    ('cognates', 30),
    ('noun_transfer', 40),
    ('spanglish', 50),
])
def test_cli_end_to_end(tmp_path, monkeypatch, variation, magnitude):
    # Create sample CSV
    data_file = tmp_path / 'texts.csv'
    data_file.write_text('text,true_grade\nhello world,11\n')
    # Create dummy model script
    model_file = tmp_path / 'model.py'
    model_file.write_text('def grade(text):\n    return len(text)\n')
    # Run CLI
    runner = CliRunner()
    result = runner.invoke(main, [
        '--data', str(data_file),
        '--model-script', str(model_file),
        '--model-func', 'grade',
        '--variations', variation,
        '--magnitudes', str(magnitude),
        '--output', str(tmp_path / 'out.csv'),
    ])
    assert result.exit_code == 0, result.output
    # Verify output CSV
    out_df = pd.read_csv(tmp_path / 'out.csv')
    assert 'perturbed_grade' in out_df.columns
    # Should have one row
    assert len(out_df) == 1

def test_cli_integration(tmp_path):
    # Create test CSV
    data_path = tmp_path / 'data.csv'
    pd.DataFrame({'text': ['This is a test.', 'Another essay.']}).to_csv(data_path, index=False)

    # Create test model script
    model_path = tmp_path / 'model.py'
    model_code = 'def grade(text):\n    return 1 if "test" in text.lower() else 0\n'
    model_path.write_text(model_code)

    # Output path
    output_path = tmp_path / 'results.csv'

    # Run CLI as a module
    result = subprocess.run([
        sys.executable, '-m', 'ai_bias_audit.cli',
        '--data', str(data_path),
        '--model-script', str(model_path),
        '--variations', 'spelling',
        '--magnitudes', '10',
        '--output', str(output_path)
    ], capture_output=True, text=True)

    assert result.returncode == 0, result.stderr
    assert output_path.exists()
    df = pd.read_csv(output_path)
    assert not df.empty