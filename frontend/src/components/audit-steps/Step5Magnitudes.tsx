import React, { useState } from 'react';
import {
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Slider,
  TextField,
  Alert,
  Tooltip,
} from '@mui/material';
import { AuditState, Variation } from '../../types';

interface Step5MagnitudesProps {
  auditState: AuditState;
  onComplete: (data: Partial<AuditState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step5Magnitudes: React.FC<Step5MagnitudesProps> = ({
  auditState,
  onComplete,
  onNext,
  onBack,
}) => {
  const [variationMagnitudes, setVariationMagnitudes] = useState<Record<string, number>>(
    auditState.variationMagnitudes
  );
  // Add a separate state for the text field values (can be string or empty)
  const [magnitudeInputs, setMagnitudeInputs] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    auditState.selectedVariations.forEach((variation: Variation) => {
      const val = auditState.variationMagnitudes[variation.id];
      initial[variation.id] = val !== undefined ? String(val) : String(variation.defaultMagnitude);
    });
    return initial;
  });

  const handleMagnitudeChange = (variationId: string, value: number) => {
    setVariationMagnitudes(prev => ({
      ...prev,
      [variationId]: value,
    }));
    setMagnitudeInputs(prev => ({
      ...prev,
      [variationId]: String(value),
    }));
  };

  // Handle text input change (allow empty string)
  const handleMagnitudeInputChange = (variationId: string, value: string) => {
    // Allow empty string for editing
    setMagnitudeInputs(prev => ({
      ...prev,
      [variationId]: value,
    }));
    // Only update the number state if the value is a valid number
    const num = Number(value);
    if (value !== '' && !isNaN(num)) {
      setVariationMagnitudes(prev => ({
        ...prev,
        [variationId]: num,
      }));
    }
  };

  // On blur, if the input is empty or invalid, reset to default or last valid value
  const handleMagnitudeInputBlur = (variation: Variation) => {
    const value = magnitudeInputs[variation.id];
    const num = Number(value);
    if (value === '' || isNaN(num)) {
      // Reset to last valid value or default
      const fallback = variationMagnitudes[variation.id] ?? variation.defaultMagnitude;
      setMagnitudeInputs(prev => ({
        ...prev,
        [variation.id]: String(fallback),
      }));
    } else {
      // Clamp to range
      const clamped = Math.max(variation.magnitudeRange[0], Math.min(num, variation.magnitudeRange[1]));
      setVariationMagnitudes(prev => ({
        ...prev,
        [variation.id]: clamped,
      }));
      setMagnitudeInputs(prev => ({
        ...prev,
        [variation.id]: String(clamped),
      }));
    }
  };

  const handleNext = () => {
    onComplete({ variationMagnitudes });
    onNext();
  };

  const canProceed = auditState.selectedVariations.length > 0;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Step 5: Magnitude Selection
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Set the magnitude for each selected variation. Higher magnitudes create more pronounced changes.
      </Typography>

      {auditState.selectedVariations.map((variation: Variation) => (
        <Card key={variation.id} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {variation.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {variation.description}
            </Typography>
            
            <Box sx={{ px: 2 }}>
              <Slider
                value={variationMagnitudes[variation.id] ?? variation.defaultMagnitude}
                onChange={(_, value) => handleMagnitudeChange(variation.id, value as number)}
                min={variation.magnitudeRange[0]}
                max={variation.magnitudeRange[1]}
                marks={[
                  { value: variation.magnitudeRange[0], label: variation.magnitudeRange[0] },
                  { value: variation.magnitudeRange[1], label: variation.magnitudeRange[1] },
                ]}
                valueLabelDisplay="auto"
              />
            </Box>
            
            <Box sx={{ mt: 2 }}>
              <TextField
                label="Magnitude Value"
                type="number"
                value={magnitudeInputs[variation.id] ?? ''}
                onChange={(e) => handleMagnitudeInputChange(variation.id, e.target.value)}
                onBlur={() => handleMagnitudeInputBlur(variation)}
                inputProps={{
                  min: variation.magnitudeRange[0],
                  max: variation.magnitudeRange[1],
                }}
                size="small"
                sx={{ width: 150 }}
              />
            </Box>
          </CardContent>
        </Card>
      ))}

      {auditState.selectedVariations.length === 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          No variations selected. Please go back to Step 2 to select variations.
        </Alert>
      )}

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button onClick={onBack}>
          Back
        </Button>
        <Tooltip 
          title={!canProceed ? "Please make sure you complete all required steps before proceeding." : ""}
          open={!canProceed ? undefined : false}
        >
          <span>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!canProceed}
            >
              Next Step
            </Button>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default Step5Magnitudes; 