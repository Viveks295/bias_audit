import pytest
import pandas as pd
from ai_bias_audit.auditor import Auditor

@pytest.fixture
def sample_data():
    return pd.DataFrame({
        'text': ['This is a test.', 'Another essay.', 'Test again!'],
        'true_grade': [1, 0, 1]
    })

@pytest.fixture
def dummy_model():
    return lambda text: 1 if 'test' in text.lower() else 0

@pytest.fixture
def auditor(sample_data, dummy_model):
    return Auditor(model=dummy_model, data=sample_data) 