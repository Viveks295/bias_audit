# AI Bias Audit Frontend

A modern React frontend for the AI Bias Audit Framework, providing an intuitive web interface for auditing bias in AI grading models.

## Features

- **Step-by-Step Audit Process**: Guided workflow following the systematic bias audit framework
- **Modern UI**: Built with Material-UI for a clean, professional interface
- **Interactive Components**: Real-time validation and feedback throughout the audit process
- **Data Visualization**: Charts and tables for comprehensive result analysis
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Python backend running (see main project README)

## Installation

1. Navigate to the frontend directory:
```bash
cd bias-audit-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory (optional):
```bash
REACT_APP_API_URL=http://localhost:5000
```

## Development

Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000`.

## Building for Production

Build the application for production:
```bash
npm run build
```

The built files will be in the `build` directory.

## Project Structure

```
src/
├── components/
│   ├── Header.tsx                 # Navigation header
│   └── audit-steps/              # Step-by-step audit components
│       ├── Step1LLMSetup.tsx
│       ├── Step2DataFiltering.tsx
│       ├── Step3Validation.tsx
│       ├── Step4AdditionalMeasures.tsx
│       ├── Step5Magnitudes.tsx
│       └── Step6Grouping.tsx
├── pages/
│   ├── HomePage.tsx              # Landing page
│   ├── AuditFlow.tsx             # Main audit workflow
│   ├── ResultsPage.tsx           # Results display
│   └── AboutPage.tsx             # Framework information
├── services/
│   └── api.ts                    # API integration
├── types/
│   └── index.ts                  # TypeScript type definitions
└── App.tsx                       # Main application component
```

## Audit Process Flow

The frontend implements the complete bias audit framework:

1. **LLM Setup & Assessment**: Choose model, define outcome type, assess performance
2. **Data Filtering & Variations**: Apply score cutoffs, select linguistic variations
3. **Validation & Sampling**: Validate variations and sample results
4. **Additional Measures**: Choose bias measures and statistical moments
5. **Magnitude Selection**: Set variation magnitudes and grouping variables
6. **Final Report**: Generate comprehensive audit report

## Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## API Integration

The frontend connects to the Python backend through REST API endpoints:

- `POST /audit` - Start a new audit
- `GET /variations` - Get available variations
- `POST /preview` - Preview variation effects
- `GET /results/{id}` - Get audit results
- `GET /download/{id}` - Download results as CSV

## Customization

### Adding New Variations

1. Update the `availableVariations` array in `Step2DataFiltering.tsx`
2. Add corresponding types in `types/index.ts`
3. Update the API service if needed

### Modifying the UI Theme

Edit the theme configuration in `App.tsx`:

```typescript
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    // ... other theme options
  },
});
```

### Adding New Steps

1. Create a new step component in `components/audit-steps/`
2. Add the step to the `steps` array in `AuditFlow.tsx`
3. Update the `getStepContent` function
4. Add corresponding state to `AuditState` type

## Contributing

1. Follow the existing code style and patterns
2. Add TypeScript types for new features
3. Test thoroughly before submitting changes
4. Update documentation as needed

## License

This project is part of the AI Bias Audit Framework. See the main project README for license information.
