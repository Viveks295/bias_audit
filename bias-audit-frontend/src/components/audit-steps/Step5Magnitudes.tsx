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

  const handleMagnitudeChange = (variationId: string, value: number) => {
    setVariationMagnitudes(prev => ({
      ...prev,
      [variationId]: value,
    }));
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
                value={variationMagnitudes[variation.id] || variation.defaultMagnitude}
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
                value={variationMagnitudes[variation.id] || variation.defaultMagnitude}
                onChange={(e) => handleMagnitudeChange(variation.id, Number(e.target.value))}
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

export default Step5Magnitudes; 