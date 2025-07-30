# AI Bias Audit Framework

A comprehensive framework for auditing bias in AI grading models through systematic text variation analysis. This project provides both a Python backend (with a package and REST API) and a modern React frontend for an intuitive user interface.

---

## 🚀 Quick Start

#### Python Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

##### Running in a Virtual Environment (Recommended)

To avoid dependency conflicts and ensure compatibility:

```bash
# Navigate to the backend folder
cd backend

# Create a virtual environment with Python 3.11
python3.11 -m venv venv

# Activate the virtual environment
source venv/bin/activate   # On macOS/Linux
# .\venv\Scripts\activate   # On Windows

# Install dependencies
pip install -r requirements.txt

# Run the Flask app
python app.py
```

To exit the virtual environment:

```bash
deactivate
```

#### React Frontend

```bash
cd frontend
npm install
npm start
```

---

## 📁 Project Structure

```
backend/
├── ai_bias_audit/              # Python package (core audit logic)
│   ├── auditor.py              # Core audit functionality
│   ├── variations/             # Text variation implementations
│   └── features.py             # Text feature extraction
├── api.py                      # REST API for React frontend
├── app.py                      # Original Flask app (form-based)
├── requirements.txt            # Backend dependencies
├── setup.py                    # Python package setup
├── test_data/                  # Sample data and models
├── tests/                      # Python tests
frontend/
├── package.json                # React frontend dependencies
├── src/                        # React source code
│   ├── components/             # React components
│   ├── pages/                  # Page components
│   ├── services/               # API integration
│   └── types/                  # TypeScript definitions
README.md                       # Project documentation
```

## 🎯 Features

### Core Framework

- **Systematic Bias Detection**: Apply controlled linguistic variations to identify bias
- **Multiple Variation Types**: Spelling errors, Spanglish, noun transfers, cognates, PIO
- **Comprehensive Metrics**: Multiple bias measures and statistical moments
- **Group-based Analysis**: Analyze bias across demographic groups
- **Performance Assessment**: Evaluate model performance before auditing

### React Frontend

- **Step-by-Step Workflow**: Guided audit process following the framework
- **Modern UI**: Clean, professional interface
- **Interactive Components**: Real-time validation and feedback
- **Data Visualization**: Charts and tables for result analysis
- **Responsive Design**: Works on desktop and mobile devices

### Python Backend

- **REST API**: Clean API endpoints for frontend integration
- **File Upload**: Support for CSV data and model scripts
- **Session Management**: Track audit sessions and results
- **CSV Export**: Download audit results for further analysis

## 🔧 Installation

### Prerequisites

- Python 3.11
- Node.js 14+
- npm or yarn

### Python Package (for development or direct use)

```bash
cd backend
pip install -e .

# Install NLTK data
python - <<EOF
import nltk
nltk.download('punkt')
nltk.download('punkt_tab')
nltk.download('averaged_perceptron_tagger')
EOF
```

### React Frontend

```bash
cd frontend
npm install
```

### Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

## 📖 Usage

### Using the React Frontend

1. **Start the Application**

   #### Python Backend

   ```bash
   cd backend
   pip install -r requirements.txt
   python app.py
   ```

   #### React Frontend

   ```bash
   cd frontend
   npm install
   npm start
   ```

2. **Follow the Audit Process**

   - Choose your LLM and define outcome type
   - Select linguistic variations to test
   - Set variation magnitudes
   - Configure additional measures and grouping
   - Generate and view results

3. **View Results**
   - Interactive charts showing bias analysis
   - Detailed tables with all metrics
   - Download results as CSV

### Using the Python Package Directly

```python
import pandas as pd
from ai_bias_audit.auditor import Auditor

# Load data
df = pd.read_csv('test_data/essays.csv')

# Define grading model
def my_model(text):
    # Your model implementation
    return score

# Create auditor and run audit
auditor = Auditor(model=my_model, data=df)
report = auditor.audit(['spelling', 'spanglish'], [30, 50])
print(report.head())
```

### Using the CLI

```bash
ai-bias-audit --data test_data/essays.csv --model-script test_data/model.py --model-func grade \
  --variations spelling --magnitudes 30 \
  --variations spanglish --magnitudes 50 \
  --output test_data/audit_results.csv
```

## 🔍 Audit Process

The framework follows a systematic 6-step process:

1. **LLM Setup & Assessment**

   - Choose language model
   - Define outcome type (binary/continuous)
   - Select performance metric
   - Assess initial performance

2. **Data Filtering & Variations**

   - Apply optional score cutoffs
   - Select linguistic variations to test

3. **Validation & Sampling**

   - Validate selected variations
   - Sample audit results

4. **Additional Measures**

   - Choose additional bias measures
   - Configure statistical moments

5. **Magnitude Selection**

   - Set variation magnitudes
   - Configure grouping variables

6. **Final Report**
   - Generate comprehensive audit report
   - Analyze bias across groups

## 📊 Linguistic Variations

### Available Variations

- **Spelling Errors**: Introduce spelling mistakes
- **Spanglish**: Mix Spanish and English phrases
- **Noun Transfer**: Replace nouns with Spanish translation
- **Cognates**: Use cognate words from Spanish
- **PIO**: Phonetically-induced spelling errors

### Bias Measures

- **B₀**: Raw difference between original and perturbed grades
- **B₁**: Normalized bias measure accounting for variation magnitude
- **B₂**: Feature-weighted bias measure considering amount of text able to be changed
- **B₃**: Grade-adjusted bias measure accounting for original grade levels

## 📝 API Documentation

### Endpoints

- `GET /api/variations` - Get available variations
- `POST /api/preview` - Preview variation effects
- `POST /api/audit` - Start new audit
- `GET /api/results/{id}` - Get audit results
- `GET /api/download/{id}` - Download results as CSV
- `GET /api/health` - Health check

### Example API Usage

```javascript
// Start audit
const response = await fetch("/api/audit", {
  method: "POST",
  body: formData,
})

// Get results
const results = await fetch("/api/results/audit_1")
```

## 📄 License

This project is licensed under the MIT License.
