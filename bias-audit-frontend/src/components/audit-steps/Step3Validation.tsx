import React, { useState } from 'react';
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
} from '@mui/material';
import { AuditState } from '../../types';

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

  const handleValidationChange = (value: string) => {
    setVariationsValid(value === 'true');
  };

  const handleSampleVariations = async () => {
    setIsSampling(true);
    // Simulate sampling process
    setTimeout(() => {
      setIsSampling(false);
    }, 2000);
  };

  const handleNext = () => {
    onComplete({ variationsValid });
    onNext();
  };

  const canProceed = variationsValid !== null;

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
            <Button
              variant="outlined"
              onClick={handleSampleVariations}
              disabled={isSampling}
              startIcon={isSampling ? <CircularProgress size={20} /> : null}
            >
              {isSampling ? 'Sampling...' : 'Sample Variations'}
            </Button>
          </Box>

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