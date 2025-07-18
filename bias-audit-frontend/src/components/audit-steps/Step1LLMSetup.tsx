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
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { CloudUpload, CheckCircle, ExpandMore, PlayArrow, SkipNext } from '@mui/icons-material';
import { AuditState, LLMModel, PerformanceMetric } from '../../types';
import { auditAPI } from '../../services/api';
import Papa from 'papaparse';

interface Step1LLMSetupProps {
  auditState: AuditState;
  onComplete: (data: Partial<AuditState>) => void;
  onNext: () => void;
}

const availableLLMs: LLMModel[] = [
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    description: 'OpenAI GPT-4.1 model for text analysis',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'OpenAI GPT-4o model for text analysis',
  },
  {
    id: 'custom',
    name: 'Custom Model',
    description: 'Upload your own Python model for custom grading',
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
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedLLM, setSelectedLLM] = useState<LLMModel | null>(auditState.selectedLLM);
  const [outcomeType, setOutcomeType] = useState<'binary' | 'continuous' | null>(auditState.outcomeType);
  const [selectedMetric, setSelectedMetric] = useState<PerformanceMetric | null>(auditState.selectedMetric);
  const [isAssessing, setIsAssessing] = useState(false);
  const [initialPerformance, setInitialPerformance] = useState<number | null>(auditState.initialPerformance);
  const [performanceSatisfactory, setPerformanceSatisfactory] = useState<boolean | null>(auditState.performanceSatisfactory);
  const [customModelFile, setCustomModelFile] = useState<File | null>(null);
  const [customModelError, setCustomModelError] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [rubric, setRubric] = useState<string>("");
  const [assessmentResults, setAssessmentResults] = useState<any[] | null>(null);
  const [assessmentMetric, setAssessmentMetric] = useState<string | null>(null);
  const [assessmentMetricValue, setAssessmentMetricValue] = useState<number | null>(null);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const [assessmentSkipped, setAssessmentSkipped] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(auditState.sessionId || null);
  const [promptError, setPromptError] = useState<string | null>(null);

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
      // Use PapaParse to parse CSV robustly
      const parsed = Papa.parse(content, { header: false });
      if (parsed.data && parsed.data.length > 0) {
        const headers = parsed.data[0] as string[];
        setCsvHeaders(headers);
        setCsvData((parsed.data as string[][]).slice(1, 6)); // first 5 rows
        
        // Check if text column exists
        const hasTextColumn = headers.some(header => 
          header.toLowerCase() === 'text'
        );
        
        if (!hasTextColumn) {
          setUploadError('CSV file must contain a column named "text"');
          setUploadedFile(null);
          setCsvHeaders([]);
          setCsvData([]);
        } else {
          setUploadedFile(file);
        }
      }
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
    setOutcomeType(null);
    setSelectedMetric(null);
    setCustomModelFile(null);
    setCustomModelError(null);
    setAiPrompt("");
    setRubric("");
    setPromptError(null);
  };

  const handleCustomModelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.py')) {
      setCustomModelError('Please upload a Python (.py) file');
      setCustomModelFile(null);
      return;
    }
    setCustomModelFile(file);
    setCustomModelError(null);
  };

  const handleMetricChange = (metricId: string) => {
    const metric = performanceMetrics.find(m => m.id === metricId);
    setSelectedMetric(metric || null);
  };

  const handleAssessPerformance = async () => {
    if (!selectedLLM || !selectedMetric || !uploadedFile) return;
    
    // Check if AI prompt is required and filled
    if ((selectedLLM.id === 'gpt-4.1' || selectedLLM.id === 'gpt-4o') && !aiPrompt.trim()) {
      setPromptError('Model AI prompt is required before assessing performance');
      return;
    }
    
    setPromptError(null);
    setIsAssessing(true);
    setAssessmentError(null);
    setAssessmentResults(null);
    setAssessmentMetric(null);
    setAssessmentMetricValue(null);
    setAssessmentSkipped(false);
    try {
      const response = await auditAPI.assessPerformance({
        csvFile: uploadedFile,
        modelType: selectedLLM.id,
        aiPrompt: selectedLLM.id !== 'custom' ? aiPrompt : undefined,
        rubric: selectedLLM.id !== 'custom' ? rubric : undefined,
        metric: selectedMetric.id,
        customModelFile: selectedLLM.id === 'custom' ? customModelFile || undefined : undefined,
      });
      setAssessmentResults(response.samples);
      setAssessmentMetric(response.metric);
      setAssessmentMetricValue(response.metric_value);
      setSessionId(response.session_id);  // Store session_id for later use
      // Set initial performance and satisfactory if metric is available
      if (typeof response.metric_value === 'number') {
        setInitialPerformance(response.metric_value);
        setPerformanceSatisfactory(response.metric_value >= 0.7);
      } else {
        setInitialPerformance(null);
        setPerformanceSatisfactory(null);
      }
    } catch (err: any) {
      setAssessmentError(err?.response?.data?.error || err.message || 'Error assessing performance');
    } finally {
      setIsAssessing(false);
    }
  };

  const handleSkipAssessment = () => {
    // Check if AI prompt is required and filled
    if ((selectedLLM?.id === 'gpt-4.1' || selectedLLM?.id === 'gpt-4o') && !aiPrompt.trim()) {
      setPromptError('Model AI prompt is required before skipping assessment');
      return;
    }
    
    setPromptError(null);
    setAssessmentSkipped(true);
    setInitialPerformance(null);
    setPerformanceSatisfactory(null);
    setAssessmentResults(null);
    setAssessmentMetric(null);
    setAssessmentMetricValue(null);
  };

  const handleNext = () => {
    if (
      uploadedFile &&
      selectedLLM &&
      outcomeType &&
      ((selectedLLM.id === 'custom' && customModelFile) ||
        ((selectedLLM.id === 'gpt-4.1' || selectedLLM.id === 'gpt-4o') && aiPrompt)) &&
      selectedMetric &&
      (assessmentSkipped || assessmentResults)
    ) {
      onComplete({
        uploadedFile,
        filePreview,
        selectedLLM,
        outcomeType,
        selectedMetric,
        initialPerformance,
        performanceSatisfactory,
        customModelFile: selectedLLM.id === 'custom' ? customModelFile : undefined,
        aiPrompt: selectedLLM.id !== 'custom' ? aiPrompt : undefined,
        rubric: selectedLLM.id !== 'custom' && rubric ? rubric : undefined,
        sessionId: sessionId || undefined,
      });
      onNext();
    }
  };

  const canProceed =
    uploadedFile &&
    selectedLLM &&
    outcomeType &&
    ((selectedLLM.id === 'custom' && customModelFile) ||
      ((selectedLLM.id === 'gpt-4.1' || selectedLLM.id === 'gpt-4o') && aiPrompt)) &&
    selectedMetric &&
    (assessmentSkipped || assessmentResults);

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
                borderColor: uploadedFile ? 'success.main' : 'grey.300',
                backgroundColor: uploadedFile ? 'success.50' : 'grey.50',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: uploadedFile ? 'success.main' : 'primary.main',
                  backgroundColor: uploadedFile ? 'success.50' : 'grey.100',
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
              {uploadedFile ? (
                <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
              ) : (
                <CloudUpload sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
              )}
              <Typography variant="h6" gutterBottom color={uploadedFile ? 'success.main' : 'inherit'}>
                {uploadedFile ? uploadedFile.name : 'Click to upload CSV file'}
              </Typography>
              <Typography variant="body2" color={uploadedFile ? 'success.main' : 'text.secondary'}>
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

            {csvHeaders.length > 0 && (
              <Accordion sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle2">
                    File Preview (First 5 rows)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      backgroundColor: 'grey.50',
                      maxHeight: 300,
                      overflow: 'auto',
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f5f5f5' }}>
                        {csvHeaders.map((header, index) => (
                          <th
                            key={index}
                            style={{
                              textAlign: 'left',
                              padding: '8px',
                              borderBottom: '2px solid #ddd',
                              fontWeight: 'bold',
                            }}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.map((row, rowIndex) => (
                        <tr key={rowIndex} style={{ borderBottom: '1px solid #eee' }}>
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              style={{
                                padding: '8px',
                                verticalAlign: 'top',
                                maxWidth: 200,
                                wordBreak: 'break-word',
                              }}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Paper>
              </AccordionDetails>
            </Accordion>
            )}
          </CardContent>
        </Card>

        {/* LLM Selection */}
        <Card sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              2. Choose Your Model
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

            {/* Conditional UI for Custom Model or GPT models */}
            {selectedLLM?.id === 'custom' && (
              <Box sx={{ mt: 2 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    border: '2px dashed',
                    borderColor: customModelFile ? 'success.main' : 'grey.300',
                    backgroundColor: customModelFile ? 'success.50' : 'grey.50',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: customModelFile ? 'success.main' : 'primary.main',
                      backgroundColor: customModelFile ? 'success.50' : 'grey.100',
                    },
                  }}
                  onClick={() => document.getElementById('python-upload')?.click()}
                >
                  <input
                    id="python-upload"
                    type="file"
                    accept=".py"
                    hidden
                    onChange={handleCustomModelUpload}
                  />
                  {customModelFile ? (
                    <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                  ) : (
                    <CloudUpload sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                  )}
                  <Typography variant="h6" gutterBottom color={customModelFile ? 'success.main' : 'inherit'}>
                    {customModelFile ? customModelFile.name : 'Click to upload Python model (.py)'}
                  </Typography>
                  <Typography variant="body2" color={customModelFile ? 'success.main' : 'text.secondary'}>
                    {customModelFile ? 'Python model uploaded successfully' : 'Drag and drop or click to browse'}
                  </Typography>
                </Paper>
                {customModelError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {customModelError}
                  </Alert>
                )}
              </Box>
            )}
            {(selectedLLM?.id === 'gpt-4.1' || selectedLLM?.id === 'gpt-4o') && (
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Model AI Prompt"
                  value={aiPrompt}
                  onChange={e => {
                    setAiPrompt(e.target.value);
                    if (e.target.value.trim()) {
                      setPromptError(null);
                    }
                  }}
                  placeholder="Enter the prompt you will use for the AI model"
                  fullWidth
                  multiline
                  minRows={3}
                  variant="outlined"
                  error={!!promptError}
                  helperText={promptError}
                  required
                />
                <TextField
                  label="Rubric (Optional)"
                  value={rubric}
                  onChange={e => setRubric(e.target.value)}
                  placeholder="Enter the grading rubric for the model"
                  fullWidth
                  multiline
                  minRows={3}
                  variant="outlined"
                />
              </Box>
            )}
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
        <Card>
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
                  startIcon={isAssessing ? <CircularProgress size={20} /> : <PlayArrow />}
                >
                  {isAssessing ? 'Assessing...' : 'Assess Performance'}
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={handleSkipAssessment}
                  disabled={isAssessing}
                  startIcon={<SkipNext />}
                  sx={{ ml: 2 }}
                >
                  Skip Assessment
                </Button>
                {initialPerformance !== null && (
                  <Typography variant="body1">
                    Performance: {(initialPerformance * 100).toFixed(1)}%
                  </Typography>
                )}
              </Box>
              {promptError && (
                <Alert severity="error" sx={{ mb: 2 }}>{promptError}</Alert>
              )}
              {assessmentError && (
                <Alert severity="error" sx={{ mb: 2 }}>{assessmentError}</Alert>
              )}
              {assessmentSkipped && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  You skipped performance assessment. Bias model might not be accurate if model performance is low.
                </Alert>
              )}
              {assessmentResults && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Sampled Grading Results:
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Text</th>
                          <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Predicted Grade</th>
                          {assessmentResults.some(r => r.true_grade !== undefined && r.true_grade !== null) && (
                            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>True Grade</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {assessmentResults.map((row, idx) => (
                          <tr key={idx}>
                            <td style={{ verticalAlign: 'top', padding: '4px 8px', maxWidth: 300, wordBreak: 'break-word' }}>{row.text}</td>
                            <td style={{ verticalAlign: 'top', padding: '4px 8px' }}>{row.predicted_grade}</td>
                            {assessmentResults.some(r => r.true_grade !== undefined && r.true_grade !== null) && (
                              <td style={{ verticalAlign: 'top', padding: '4px 8px' }}>{row.true_grade ?? ''}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Paper>
                  {assessmentMetric && assessmentMetricValue !== null && (
                    <Alert severity={assessmentMetricValue >= 0.7 ? 'success' : 'warning'} sx={{ mt: 2 }}>
                      {assessmentMetric.charAt(0).toUpperCase() + assessmentMetric.slice(1)}: {(assessmentMetricValue * 100).toFixed(1)}%<br />
                      {assessmentMetricValue >= 0.7
                        ? 'Performance is satisfactory. You can proceed with the audit.'
                        : 'Performance is below threshold. Consider improving your model before auditing.'}
                    </Alert>
                  )}
                </Box>
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