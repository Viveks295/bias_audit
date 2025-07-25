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
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { AuditState } from '../../types';
import { auditAPI } from '../../services/api';

interface Step3ValidationProps {
  auditState: AuditState;
  onComplete: (data: Partial<AuditState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step3Validation: React.FC<Step3ValidationProps> = ({
  auditState,
  onComplete,
  onNext,
  onBack,
}) => {
  const [variationsValid, setVariationsValid] = useState<boolean | null>(auditState.variationsValid);
  const [isSampling, setIsSampling] = useState(false);
  const [sampledVariations, setSampledVariations] = useState<any[] | null>(auditState.sampledVariations || null);
  const [samplingError, setSamplingError] = useState<string | null>(null);

  const handleValidationChange = (value: string) => {
    setVariationsValid(value === 'true');
  };

  const handleSampleVariations = async () => {
    if (!auditState.sessionId || !auditState.selectedVariations.length) {
      setSamplingError('Missing session ID or no variations selected');
      return;
    }

    setIsSampling(true);
    setSamplingError(null);
    
    try {
      const response = await auditAPI.sampleVariations({
        sessionId: auditState.sessionId,
        variationTypes: auditState.selectedVariations.map(v => v.id),
        sampleSize: 5,
        magnitude: 50,
      });
      
      setSampledVariations(response.samples);
    } catch (err: any) {
      setSamplingError(err?.response?.data?.error || err.message || 'Error sampling variations');
    } finally {
      setIsSampling(false);
    }
  };

  // Automatically sample variations on mount if not already sampled
  useEffect(() => {
    if (!sampledVariations && !isSampling && auditState.sessionId && auditState.selectedVariations.length) {
      handleSampleVariations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNext = () => {
    onComplete({ 
      variationsValid,
      sampledVariations: sampledVariations || undefined,
    });
    onNext();
  };

  const canProceed = variationsValid === true;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Step 3: Validation & Sampling
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Validate the sampled variations and proceed with the audit.
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Sample Validation
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            We've sampled variations from your selected options. Are the sampled variations valid for your use case?
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            {/* Button removed: sampling now happens automatically on mount */}
            {isSampling && <CircularProgress size={20} />}
          </Box>

          {samplingError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {samplingError}
            </Alert>
          )}

          {sampledVariations && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Sampled Variations (5 rows from your CSV):
              </Typography>
              
              {sampledVariations.map((sample, index) => (
                <Accordion key={index} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography>
                      Row {sample.row_index}: "{sample.original.substring(0, 50)}..."
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Original Text:
                      </Typography>
                      <Paper sx={{ p: 2, mb: 2, backgroundColor: 'grey.50' }}>
                        {sample.original}
                      </Paper>
                      
                      <Typography variant="subtitle2" gutterBottom>
                        Variations:
                      </Typography>
                      {Object.entries(sample.variations).map(([variationType, variedText]) => (
                        <Box key={variationType} sx={{ mb: 2 }}>
                          <Typography variant="body2" fontWeight="bold" color="primary">
                            {variationType.charAt(0).toUpperCase() + variationType.slice(1)}:
                          </Typography>
                          <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                            {variedText as string}
                          </Paper>
                        </Box>
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}

          <FormControl component="fieldset">
            <RadioGroup
              value={variationsValid === null ? '' : variationsValid.toString()}
              onChange={(e) => handleValidationChange(e.target.value)}
            >
              <FormControlLabel value="true" control={<Radio />} label="Yes, the variations are valid" />
              <FormControlLabel value="false" control={<Radio />} label="No, try other variations" />
            </RadioGroup>
          </FormControl>
        </CardContent>
      </Card>

      {variationsValid === false && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          You can go back to Step 2 to select different variations, or choose to proceed without additional measures.
        </Alert>
      )}

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

export default Step3Validation; 