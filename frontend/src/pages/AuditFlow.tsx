import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  Paper,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AuditState } from '../types';
import Step1LLMSetup from '../components/audit-steps/Step1LLMSetup';
import Step2DataFiltering from '../components/audit-steps/Step2DataFiltering';
import Step3Validation from '../components/audit-steps/Step3Validation';
import Step4AdditionalMeasures from '../components/audit-steps/Step4AdditionalMeasures';
import Step5Magnitudes from '../components/audit-steps/Step5Magnitudes';
import Step6Grouping from '../components/audit-steps/Step6Grouping';

const steps = [
  'LLM Setup & Assessment',
  'Data Filtering & Variations',
  'Validation & Sampling',
  'Additional Measures',
  'Magnitude Selection',
  'Grouping & Final Report',
];

const AuditFlow: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [auditState, setAuditState] = useState<AuditState>({
    uploadedFile: null,
    filePreview: null,
    selectedLLM: null,
    outcomeType: null,
    selectedMetric: null,
    initialPerformance: null,
    performanceSatisfactory: null,
    useScoreCutoff: null,
    cutoffScore: null,
    selectedVariations: [],
    variationsValid: null,
    useAdditionalMeasures: null,
    selectedMeasures: [],
    useHigherMoments: null,
    selectedMoments: [],
    variationMagnitudes: {},
    useGrouping: null,
    groupingVariable: null,
    notificationEmail: null,
    auditResults: null,
    currentStep: 0,
  });

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    setAuditState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
    setAuditState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }));
  };

  const handleStepComplete = (stepData: Partial<AuditState>) => {
    setAuditState(prev => ({ ...prev, ...stepData }));
  };

  const handleFinish = (updatedAuditState?: Partial<AuditState>) => {
    // Navigate to results page with audit state
    const finalAuditState = updatedAuditState ? { ...auditState, ...updatedAuditState } : auditState;
    navigate('/results', { state: { auditState: finalAuditState } });
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Step1LLMSetup
            auditState={auditState}
            onComplete={handleStepComplete}
            onNext={handleNext}
          />
        );
      case 1:
        return (
          <Step2DataFiltering
            auditState={auditState}
            onComplete={handleStepComplete}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 2:
        return (
          <Step3Validation
            auditState={auditState}
            onComplete={handleStepComplete}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <Step4AdditionalMeasures
            auditState={auditState}
            onComplete={handleStepComplete}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <Step5Magnitudes
            auditState={auditState}
            onComplete={handleStepComplete}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 5:
        return (
          <Step6Grouping
            auditState={auditState}
            onComplete={handleStepComplete}
            onFinish={handleFinish}
            onBack={handleBack}
          />
        );
      default:
        return 'Unknown step';
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          AI Bias Audit Process
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Follow the steps below to systematically audit your AI model for bias
        </Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      <Paper sx={{ p: 3 }}>
        {getStepContent(activeStep)}
      </Paper>
    </Container>
  );
};

export default AuditFlow; 