import React, { useState } from 'react';
import {
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { AuditState, LLMModel, PerformanceMetric } from '../../types';

interface Step1LLMSetupProps {
  auditState: AuditState;
  onComplete: (data: Partial<AuditState>) => void;
  onNext: () => void;
}

const availableLLMs: LLMModel[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    description: 'OpenAI GPT-4 model for text generation and analysis',
    type: 'continuous',
  },
  {
    id: 'gpt-3.5',
    name: 'GPT-3.5',
    description: 'OpenAI GPT-3.5 model for text generation and analysis',
    type: 'continuous',
  },
  {
    id: 'custom-binary',
    name: 'Custom Binary Classifier',
    description: 'Custom model for binary classification tasks',
    type: 'binary',
  },
  {
    id: 'custom-continuous',
    name: 'Custom Continuous Model',
    description: 'Custom model for continuous prediction tasks',
    type: 'continuous',
  },
];

const performanceMetrics: PerformanceMetric[] = [
  {
    id: 'accuracy',
    name: 'Accuracy',
    description: 'Fraction of correct predictions',
    applicableTypes: ['binary'],
  },
  {
    id: 'precision',
    name: 'Precision',
    description: 'True positives / (True positives + False positives)',
    applicableTypes: ['binary'],
  },
  {
    id: 'recall',
    name: 'Recall',
    description: 'True positives / (True positives + False negatives)',
    applicableTypes: ['binary'],
  },
  {
    id: 'f1',
    name: 'F1 Score',
    description: 'Harmonic mean of precision and recall',
    applicableTypes: ['binary'],
  },
  {
    id: 'mse',
    name: 'Mean Squared Error',
    description: 'Average squared difference between predictions and actual values',
    applicableTypes: ['continuous'],
  },
  {
    id: 'mae',
    name: 'Mean Absolute Error',
    description: 'Average absolute difference between predictions and actual values',
    applicableTypes: ['continuous'],
  },
  {
    id: 'r2',
    name: 'R² Score',
    description: 'Coefficient of determination',
    applicableTypes: ['continuous'],
  },
];

const Step1LLMSetup: React.FC<Step1LLMSetupProps> = ({
  auditState,
  onComplete,
  onNext,
}) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(auditState.uploadedFile);
  const [filePreview, setFilePreview] = useState<string | null>(auditState.filePreview);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedLLM, setSelectedLLM] = useState<LLMModel | null>(auditState.selectedLLM);
  const [outcomeType, setOutcomeType] = useState<'binary' | 'continuous' | null>(auditState.outcomeType);
  const [selectedMetric, setSelectedMetric] = useState<PerformanceMetric | null>(auditState.selectedMetric);
  const [isAssessing, setIsAssessing] = useState(false);
  const [initialPerformance, setInitialPerformance] = useState<number | null>(auditState.initialPerformance);
  const [performanceSatisfactory, setPerformanceSatisfactory] = useState<boolean | null>(auditState.performanceSatisfactory);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setUploadError('Please upload a CSV file');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFilePreview(content.substring(0, 500) + (content.length > 500 ? '...' : ''));
      setUploadedFile(file);
      setIsUploading(false);
    };
    reader.onerror = () => {
      setUploadError('Error reading file');
      setIsUploading(false);
    };
    reader.readAsText(file);
  };

  const handleLLMChange = (llmId: string) => {
    const llm = availableLLMs.find(l => l.id === llmId);
    setSelectedLLM(llm || null);
    setOutcomeType(llm?.type || null);
    setSelectedMetric(null);
  };

  const handleMetricChange = (metricId: string) => {
    const metric = performanceMetrics.find(m => m.id === metricId);
    setSelectedMetric(metric || null);
  };

  const handleAssessPerformance = async () => {
    if (!selectedLLM || !selectedMetric) return;

    setIsAssessing(true);
    
    // Simulate API call to assess performance
    setTimeout(() => {
      const performance = Math.random() * 0.4 + 0.6; // Random performance between 0.6-1.0
      setInitialPerformance(performance);
      setPerformanceSatisfactory(performance >= 0.7);
      setIsAssessing(false);
    }, 2000);
  };

  const handleNext = () => {
    if (uploadedFile && selectedLLM && outcomeType && selectedMetric && initialPerformance !== null && performanceSatisfactory !== null) {
      onComplete({
        uploadedFile,
        filePreview,
        selectedLLM,
        outcomeType,
        selectedMetric,
        initialPerformance,
        performanceSatisfactory,
      });
      onNext();
    }
  };

  const canProceed = uploadedFile && selectedLLM && outcomeType && selectedMetric && initialPerformance !== null && performanceSatisfactory !== null;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Step 1: Data Upload & LLM Setup
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Upload your dataset and configure your language model for bias auditing.
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
        {/* Data Upload */}
        <Card sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              1. Upload Your Dataset
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Please provide a CSV file with the following columns:
            </Typography>
            <Box component="ul" sx={{ pl: 2, mb: 2 }}>
              <Typography component="li" variant="body2">
                <strong>text</strong> (required): The text content to be analyzed
              </Typography>
              <Typography component="li" variant="body2">
                <strong>true_grade</strong> (optional): The actual grade or score for comparison
              </Typography>
              <Typography component="li" variant="body2">
                <strong>demographic_group</strong> (optional): Demographic information for bias analysis
              </Typography>
            </Box>
            
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                textAlign: 'center',
                border: '2px dashed',
                borderColor: 'grey.300',
                backgroundColor: 'grey.50',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'grey.100',
                },
              }}
              onClick={() => document.getElementById('csv-upload')?.click()}
            >
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <CloudUpload sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                {uploadedFile ? uploadedFile.name : 'Click to upload CSV file'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {uploadedFile ? 'File uploaded successfully' : 'Drag and drop or click to browse'}
              </Typography>
              {isUploading && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  <Typography variant="body2">Processing file...</Typography>
                </Box>
              )}
            </Paper>

            {uploadError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {uploadError}
              </Alert>
            )}

            {filePreview && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  File Preview:
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    backgroundColor: 'grey.50',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    maxHeight: 200,
                    overflow: 'auto',
                  }}
                >
                  {filePreview}
                </Paper>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* LLM Selection */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              2. Choose Your LLM
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Language Model</InputLabel>
              <Select
                value={selectedLLM?.id || ''}
                onChange={(e) => handleLLMChange(e.target.value)}
                label="Language Model"
                disabled={!uploadedFile}
              >
                {availableLLMs.map((llm) => (
                  <MenuItem key={llm.id} value={llm.id}>
                    <Box>
                      <Typography variant="body1">{llm.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {llm.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </CardContent>
        </Card>

        {/* Outcome Type */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              3. Outcome Type
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Outcome Variable Type</InputLabel>
              <Select
                value={outcomeType || ''}
                onChange={(e) => setOutcomeType(e.target.value as 'binary' | 'continuous')}
                label="Outcome Variable Type"
                disabled={!selectedLLM}
              >
                <MenuItem value="binary">Binary (Classification)</MenuItem>
                <MenuItem value="continuous">Continuous (Regression)</MenuItem>
              </Select>
            </FormControl>
          </CardContent>
        </Card>

        {/* Performance Metric */}
        <Card sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              4. Performance Metric
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Performance Metric</InputLabel>
              <Select
                value={selectedMetric?.id || ''}
                onChange={(e) => handleMetricChange(e.target.value)}
                label="Performance Metric"
                disabled={!outcomeType}
              >
                {performanceMetrics
                  .filter(metric => metric.applicableTypes.includes(outcomeType!))
                  .map((metric) => (
                    <MenuItem key={metric.id} value={metric.id}>
                      <Box>
                        <Typography variant="body1">{metric.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {metric.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </CardContent>
        </Card>

        {/* Performance Assessment */}
        {selectedLLM && selectedMetric && (
          <Card sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                5. Initial Performance Assessment
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleAssessPerformance}
                  disabled={isAssessing}
                  startIcon={isAssessing ? <CircularProgress size={20} /> : null}
                >
                  {isAssessing ? 'Assessing...' : 'Assess Performance'}
                </Button>
                {initialPerformance !== null && (
                  <Typography variant="body1">
                    Performance: {(initialPerformance * 100).toFixed(1)}%
                  </Typography>
                )}
              </Box>
              
              {initialPerformance !== null && (
                <Alert severity={performanceSatisfactory ? 'success' : 'warning'}>
                  {performanceSatisfactory 
                    ? 'Performance is satisfactory. You can proceed with the audit.'
                    : 'Performance is below threshold. Consider improving your model before auditing.'
                  }
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={!canProceed}
        >
          Next Step
        </Button>
      </Box>
    </Box>
  );
};

export default Step1LLMSetup; 