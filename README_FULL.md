# AI Bias Audit Framework

A comprehensive framework for auditing bias in AI grading models through systematic text variation analysis. This project includes both a Python package for the core functionality and a modern React frontend for an intuitive user interface.

## 🚀 Quick Start

### Option 1: Full Stack (Recommended)

Run both the React frontend and Python backend with one command:

```bash
python run_frontend.py
```

This will:
- Start the Python backend API on `http://localhost:5000`
- Start the React frontend on `http://localhost:3000`
- Open your browser automatically

### Option 2: Separate Components

#### React Frontend Only
```bash
cd bias-audit-frontend
npm install
npm start
```

#### Python Backend Only
```bash
cd webapp
pip install -r requirements.txt
python api.py
```

## 📁 Project Structure

```
bias_audit/
├── ai_bias_audit/              # Python package
│   ├── auditor.py              # Core audit functionality
│   ├── variations/             # Text variation implementations
│   └── features.py             # Text feature extraction
├── bias-audit-frontend/        # React frontend
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/              # Page components
│   │   ├── services/           # API integration
│   │   └── types/              # TypeScript definitions
│   └── package.json
├── webapp/                     # Flask backend
│   ├── app.py                  # Original Flask app
│   ├── api.py                  # REST API for React
│   └── requirements.txt
├── tests/                      # Python tests
├── test_data/                  # Sample data
└── run_frontend.py             # Full stack launcher
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
- **Modern UI**: Clean, professional interface built with Material-UI
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
- Python 3.8+
- Node.js 14+
- npm or yarn

### Python Package
```bash
# Install the package
pip install -e .

# Install NLTK data
python - <<EOF
import nltk
nltk.download('punkt')
nltk.download('averaged_perceptron_tagger')
EOF
```

### React Frontend
```bash
cd bias-audit-frontend
npm install
```

### Backend Dependencies
```bash
cd webapp
pip install -r requirements.txt
```

## 📖 Usage

### Using the React Frontend

1. **Start the Application**
   ```bash
   python run_frontend.py
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
df = pd.read_csv('essays.csv')

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
ai-bias-audit --data essays.csv --model-script model.py --model-func grade \
  --variations spelling --magnitudes 30 \
  --variations spanglish --magnitudes 50 \
  --output audit_results.csv
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
- **Spelling Errors**: Introduce controlled spelling mistakes
- **Spanglish**: Mix Spanish and English words
- **Noun Transfer**: Replace nouns with similar alternatives
- **Cognates**: Use cognate words from other languages
- **PIO**: Modify part-of-speech patterns

### Bias Measures
- **B₀**: Raw difference between original and perturbed grades
- **B₁**: Normalized bias measure accounting for variation magnitude
- **B₂**: Feature-weighted bias measure considering text characteristics
- **B₃**: Grade-adjusted bias measure accounting for original grade levels

## 🛠️ Development

### Frontend Development
```bash
cd bias-audit-frontend
npm start          # Start development server
npm run build      # Build for production
npm test           # Run tests
```

### Backend Development
```bash
cd webapp
python api.py      # Start API server
python app.py      # Start original Flask app
```

### Adding New Variations
1. Implement variation in `ai_bias_audit/variations/`
2. Register in `ai_bias_audit/variations/__init__.py`
3. Update frontend types and components
4. Add to API endpoints

## 🧪 Testing

### Python Tests
```bash
pytest tests/
```

### Frontend Tests
```bash
cd bias-audit-frontend
npm test
```

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
const response = await fetch('/api/audit', {
  method: 'POST',
  body: formData
});

// Get results
const results = await fetch('/api/results/audit_1');
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with React, Material-UI, and Flask
- Uses NLTK for natural language processing
- Inspired by research on AI bias detection

## 📞 Support

For questions or issues:
- Open an issue on GitHub
- Check the documentation
- Review the example implementations 