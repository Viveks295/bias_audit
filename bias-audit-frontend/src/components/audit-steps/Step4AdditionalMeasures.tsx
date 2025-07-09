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
  const sampleTexts = sampledVariations.map((s: any) => {
    if (selectedVariation && s.variations && s.variations[selectedVariation]) {
      return s.variations[selectedVariation];
    }
    return s.original || '';
  }).slice(0, 5);

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

  // Handler for Update Preview button
  const handleUpdatePreview = () => {
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
  };

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
    setSelectedMoments(prev => 
      prev.includes(momentId)
        ? prev.filter(id => id !== momentId)
        : [...prev, momentId]
    );
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

  const canProceed = useAdditionalMeasures !== null;

  // Determine which bias and moment columns to show
  const coreBiasCols = ['index', 'variation', 'magnitude', 'original_grade', 'perturbed_grade', 'difference', 'group'];
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
        ...Object.keys(momentsTable[0]).filter(col =>
          ['variation', 'magnitude', 'group'].includes(col)
        ),
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
            <Button
              variant="outlined"
              onClick={handleUpdatePreview}
              disabled={previewLoading}
              sx={{ mb: 2 }}
            >
              {previewLoading ? 'Loading…' : 'Update Preview'}
            </Button>
            {previewError && (
              <Typography color="error" sx={{ mb: 2 }}>{previewError}</Typography>
            )}
            {/* Bias Table */}
            {biasTable && biasTable.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1">Bias Measures Table</Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {biasTableCols.map((col) => (
                          <th key={col} style={{ borderBottom: '1px solid #ccc', padding: 4 }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {biasTable.map((row, i) => (
                        <tr key={i}>
                          {biasTableCols.map((col, j) => (
                            <td key={j} style={{ borderBottom: '1px solid #eee', padding: 4 }}>{String(row[col])}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              </Box>
            )}
            {/* Moments Table */}
            {momentsTable && momentsTable.length > 0 && (
              <Box>
                <Typography variant="subtitle1">Statistical Moments Table</Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {momentsTableCols.map((col) => (
                          <th key={col} style={{ borderBottom: '1px solid #ccc', padding: 4 }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {momentsTable.map((row, i) => (
                        <tr key={i}>
                          {momentsTableCols.map((col, j) => (
                            <td key={j} style={{ borderBottom: '1px solid #eee', padding: 4 }}>{String(row[col])}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
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
                return (
                  <FormControlLabel
                    key={moment.id}
                    control={
                      <Checkbox
                        checked={selectedMoments.includes(moment.id)}
                        onChange={() => handleMomentToggle(moment.id)}
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