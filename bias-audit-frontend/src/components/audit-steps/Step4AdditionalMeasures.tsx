import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Checkbox,
  FormGroup,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import { AuditState } from '../../types';
import { auditAPI } from '../../services/api';

interface Step4AdditionalMeasuresProps {
  auditState: AuditState;
  onComplete: (data: Partial<AuditState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const availableMeasures = [
  { id: 'bias_1', name: 'Bias Measure 1', description: 'Normalized bias measure' },
  { id: 'bias_2', name: 'Bias Measure 2', description: 'Feature-weighted bias measure' },
  { id: 'bias_3', name: 'Bias Measure 3', description: 'Grade-adjusted bias measure' },
];

const availableMoments = [
  { id: 'mean', name: 'Mean', description: 'First moment (average)' },
  { id: 'variance', name: 'Variance', description: 'Second moment (spread)' },
  { id: 'skewness', name: 'Skewness', description: 'Third moment (asymmetry)' },
  { id: 'kurtosis', name: 'Kurtosis', description: 'Fourth moment (peakedness)' },
];

const Step4AdditionalMeasures: React.FC<Step4AdditionalMeasuresProps> = ({
  auditState,
  onComplete,
  onNext,
  onBack,
}) => {
  const [useAdditionalMeasures, setUseAdditionalMeasures] = useState<boolean | null>(auditState.useAdditionalMeasures);
  const [selectedMeasures, setSelectedMeasures] = useState<string[]>(auditState.selectedMeasures);
  const [useHigherMoments, setUseHigherMoments] = useState<boolean | null>(auditState.useHigherMoments);
  const [selectedMoments, setSelectedMoments] = useState<string[]>(auditState.selectedMoments);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [biasTable, setBiasTable] = useState<any[] | null>(null);
  const [momentsTable, setMomentsTable] = useState<any[] | null>(null);

  // Get sample texts from previous step (sampledVariations)
  const sessionId = auditState.sessionId;
  const sampledVariations = auditState.sampledVariations || [];
  // Use the first variation and magnitude 50 for preview by default
  const selectedVariation = auditState.selectedVariations && auditState.selectedVariations.length > 0
    ? auditState.selectedVariations[0].id
    : undefined;
  const defaultMagnitude = 50;
  // Always use the original text for preview
  const sampleTexts = sampledVariations.map((s: any) => s.original || '').slice(0, 5);

  // Fetch preview on initial render
  useEffect(() => {
    if (!sessionId || !selectedVariation || sampleTexts.length !== 5) return;
    setPreviewLoading(true);
    setPreviewError(null);
    auditAPI.previewAudit({
      sessionId,
      sampleTexts,
      variation: selectedVariation,
      magnitude: defaultMagnitude,
    })
      .then((data) => {
        setBiasTable(data.bias_table);
        setMomentsTable(data.moments_table);
      })
      .catch((err) => {
        setPreviewError(err?.response?.data?.error || err.message || 'Error fetching preview');
        setBiasTable(null);
        setMomentsTable(null);
      })
      .finally(() => setPreviewLoading(false));
    // eslint-disable-next-line
  }, [sessionId, selectedVariation, JSON.stringify(sampleTexts)]);



  // Remove the unnecessary useEffect that was making API calls when selectedMoments changes
  // The moments table will update instantly by filtering the existing data

  const handleMeasureToggle = (measureId: string) => {
    setSelectedMeasures(prev => 
      prev.includes(measureId)
        ? prev.filter(id => id !== measureId)
        : [...prev, measureId]
    );
  };

  const handleMomentToggle = (momentId: string) => {
    // If toggling off variance, also remove skewness
    if (momentId === 'variance' && selectedMoments.includes('variance')) {
      setSelectedMoments(prev => prev.filter(id => id !== 'variance' && id !== 'skewness'));
    } else if (momentId === 'skewness' && !selectedMoments.includes('skewness')) {
      // Only allow skewness if variance is selected
      if (selectedMoments.includes('variance')) {
        setSelectedMoments(prev => [...prev, 'skewness']);
      }
    } else {
      setSelectedMoments(prev =>
        prev.includes(momentId)
          ? prev.filter(id => id !== momentId)
          : [...prev, momentId]
      );
    }
  };

  const handleNext = () => {
    onComplete({
      useAdditionalMeasures,
      selectedMeasures,
      useHigherMoments,
      selectedMoments,
    });
    onNext();
  };

  const canProceed = useAdditionalMeasures !== null && useHigherMoments !== null;

  // Determine which bias and moment columns to show
  const coreBiasCols = ['index', 'variation', 'magnitude', 'original_grade', 'perturbed_grade', 'group'];
  const biasCols = [
    'bias_0',
    ...(useAdditionalMeasures ? selectedMeasures : []),
  ];
  // For moments, always include 'mean' and any selected moments
  const momentSet = new Set(['mean', ...selectedMoments]);
  const momentCols = Array.from(momentSet);
  
  // Map frontend moment names to backend column suffixes
  const momentToSuffix: Record<string, string> = {
    'mean': 'mean',
    'variance': 'var',
    'skewness': 'skew'
  };
  
  // For each bias measure, show only selected moments
  const selectedBiasesForMoments = ['bias_0', ...(useAdditionalMeasures ? selectedMeasures : [])];

  // Only show core columns and selected bias columns
  const biasTableCols = biasTable && biasTable.length > 0
    ? [
        ...coreBiasCols.filter(col => col in biasTable[0]),
        ...biasCols.filter(col => col in biasTable[0]),
      ]
    : [];

  // Only show group/variation/magnitude and selected bias-moment columns
  const momentsTableCols = momentsTable && momentsTable.length > 0
    ? [
        ...['variation', 'magnitude'].filter(col => col in momentsTable[0]),
        ...selectedBiasesForMoments.flatMap(bias =>
          momentCols.map(moment => `${bias}_${momentToSuffix[moment]}`).filter(col => col in momentsTable[0])
        ),
      ]
    : [];

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Step 4: Additional Measures
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Choose additional bias measures and statistical moments for comprehensive analysis.
      </Typography>

      {/* Preview Audit Results Section */}
      {sessionId && sampledVariations.length === 5 && selectedVariation && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Preview Audit Results (Variation: {selectedVariation}, Magnitude: {defaultMagnitude})
            </Typography>
            {/* Loading Spinner */}
            {previewLoading && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 2 }}>
                <CircularProgress size={32} />
                <Typography variant="body2" sx={{ mt: 1 }}>Loading preview...</Typography>
              </Box>
            )}
            {/* Error */}
            {!previewLoading && previewError && (
              <Typography color="error" sx={{ mb: 2 }}>{previewError}</Typography>
            )}
            {/* Bias Table */}
            {!previewLoading && biasTable && biasTable.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1">Bias Measures Table</Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {biasTableCols.map((col) => (
                          <TableCell key={col} sx={{ fontWeight: 'bold' }}>
                            {col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {biasTable.map((row, i) => (
                        <TableRow key={i}>
                          {biasTableCols.map((col, j) => (
                            <TableCell key={j}>
                              {col === 'variation' ? (
                                <Chip label={row[col]} size="small" />
                              ) : col === 'magnitude' ? (
                                parseInt(row[col], 10)
                              ) : col === 'index' ? (
                                parseInt(row[col], 10)
                              ) : (typeof row[col] === 'number' ? row[col]?.toFixed(3) : (row[col] ?? 'N/A'))}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
            {/* Moments Table */}
            {!previewLoading && momentsTable && momentsTable.length > 0 && (
              <Box>
                <Typography variant="subtitle1">Statistical Moments Table</Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {momentsTableCols.map((col) => (
                          <TableCell key={col} sx={{ fontWeight: 'bold' }}>
                            {col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {momentsTable.map((row, i) => (
                        <TableRow key={i}>
                          {momentsTableCols.map((col, j) => (
                            <TableCell key={j}>
                              {col === 'variation' ? (
                                <Chip label={row[col]} size="small" />
                              ) : col === 'magnitude' ? (
                                parseInt(row[col], 10)
                              ) : (typeof row[col] === 'number' ? row[col]?.toFixed(3) : (row[col] ?? 'N/A'))}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Existing measure/moment selection UI */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            1. Additional Bias Measures
          </Typography>
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <RadioGroup
              value={useAdditionalMeasures === null ? '' : useAdditionalMeasures.toString()}
              onChange={(e) => setUseAdditionalMeasures(e.target.value === 'true')}
            >
              <FormControlLabel value="true" control={<Radio />} label="Yes, include additional bias measures" />
              <FormControlLabel value="false" control={<Radio />} label="No, use default measures only" />
            </RadioGroup>
          </FormControl>
          
          {useAdditionalMeasures && (
            <FormGroup>
              {availableMeasures.map((measure) => (
                <FormControlLabel
                  key={measure.id}
                  control={
                    <Checkbox
                      checked={selectedMeasures.includes(measure.id)}
                      onChange={() => handleMeasureToggle(measure.id)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">{measure.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {measure.description}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </FormGroup>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            2. Higher Statistical Moments
          </Typography>
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <RadioGroup
              value={useHigherMoments === null ? '' : useHigherMoments.toString()}
              onChange={(e) => setUseHigherMoments(e.target.value === 'true')}
            >
              <FormControlLabel value="true" control={<Radio />} label="Yes, generate higher moments" />
              <FormControlLabel value="false" control={<Radio />} label="No, use basic statistics only" />
            </RadioGroup>
          </FormControl>
          {useHigherMoments && (
            <FormGroup>
              {['variance', 'skewness'].map((momentId) => {
                const moment = availableMoments.find(m => m.id === momentId);
                if (!moment) return null;
                // Disable skewness if variance is not selected
                const isSkewness = momentId === 'skewness';
                const skewnessDisabled = isSkewness && !selectedMoments.includes('variance');
                return (
                  <FormControlLabel
                    key={moment.id}
                    control={
                      <Checkbox
                        checked={selectedMoments.includes(moment.id)}
                        onChange={() => handleMomentToggle(moment.id)}
                        disabled={skewnessDisabled}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">{moment.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {moment.description}
                        </Typography>
                      </Box>
                    }
                  />
                );
              })}
            </FormGroup>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button onClick={onBack}>
          Back
        </Button>
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

export default Step4AdditionalMeasures; 