import pandas as pd
import pytest
from click.testing import CliRunner
from essay_bias_audit.cli import main

import nltk
# Stub NLTK to avoid external data downloads
nltk.word_tokenize = lambda text: text.split()
nltk.pos_tag = lambda tokens: [(w, 'NN') for w in tokens]
nltk.sent_tokenize = lambda text: [text]
import essay_bias_audit.variations.cognates as cognates_mod
import essay_bias_audit.variations.noun_transfer as noun_mod
import essay_bias_audit.variations.spanglish as spang_mod

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
    data_file = tmp_path / 'essays.csv'
    data_file.write_text('prompt,essay,true_grade\nQ,hello world,11\n')
    # Create dummy model script
    model_file = tmp_path / 'model.py'
    model_file.write_text('def grade(prompt, essay):\n    return len(essay)\n')
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