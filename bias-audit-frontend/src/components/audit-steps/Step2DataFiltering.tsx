import React, { useState } from 'react';
import {
  Typography,
  Box,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormGroup,
  Alert,
} from '@mui/material';
import { AuditState, Variation } from '../../types';

interface Step2DataFilteringProps {
  auditState: AuditState;
  onComplete: (data: Partial<AuditState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const availableVariations: Variation[] = [
  {
    id: 'spelling',
    name: 'Spelling Errors',
    description: 'Introduce spelling mistakes in the text',
    magnitudeRange: [10, 100],
    defaultMagnitude: 50,
  },
  {
    id: 'noun_transfer',
    name: 'Noun Transfer',
    description: 'Translate nouns to Spanish',
    magnitudeRange: [10, 100],
    defaultMagnitude: 50,
  },
  {
    id: 'cognates',
    name: 'Cognates',
    description: 'Use cognate words from Spanish',
    magnitudeRange: [10, 100],
    defaultMagnitude: 50,
  },
  {
    id: 'pio',
    name: 'PIO',
    description: 'Phonetically Induced Orthography',
    magnitudeRange: [10, 100],
    defaultMagnitude: 50,
  },
  {
    id: 'spanglish',
    name: 'Spanglish',
    description: 'Mix Spanish and English phrases',
    magnitudeRange: [10, 100],
    defaultMagnitude: 50,
  }
];

const Step2DataFiltering: React.FC<Step2DataFilteringProps> = ({
  auditState,
  onComplete,
  onNext,
  onBack,
}) => {
  const [useScoreCutoff, setUseScoreCutoff] = useState<boolean | null>(auditState.useScoreCutoff);
  const [cutoffScore, setCutoffScore] = useState<number | null>(auditState.cutoffScore);
  const [selectedVariations, setSelectedVariations] = useState<Variation[]>(auditState.selectedVariations);

  const handleVariationToggle = (variation: Variation) => {
    setSelectedVariations(prev => 
      prev.find(v => v.id === variation.id)
        ? prev.filter(v => v.id !== variation.id)
        : [...prev, variation]
    );
  };

  const handleNext = () => {
    onComplete({
      useScoreCutoff,
      cutoffScore,
      selectedVariations,
    });
    onNext();
  };

  const canProceed = useScoreCutoff !== null && selectedVariations.length > 0;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Step 2: Data Filtering & Variations
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Choose whether to filter data by score cutoff and select linguistic variations to test.
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              1. Score Cutoff Filter
            </Typography>
            <FormControl component="fieldset">
              <RadioGroup
                value={useScoreCutoff === null ? '' : useScoreCutoff.toString()}
                onChange={(e) => setUseScoreCutoff(e.target.value === 'true')}
              >
                <FormControlLabel value="true" control={<Radio />} label="Yes, filter by score cutoff" />
                <FormControlLabel value="false" control={<Radio />} label="No, use all data" />
              </RadioGroup>
            </FormControl>
            
            {useScoreCutoff && (
              <Box sx={{ mt: 2 }}>
                <TextField
                  label="Cutoff Score"
                  type="number"
                  value={cutoffScore || ''}
                  onChange={(e) => setCutoffScore(Number(e.target.value))}
                  helperText="Only texts with scores above this threshold will be audited"
                  fullWidth
                />
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              2. Linguistic Variations
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Select the variations you want to apply to test your model's robustness:
            </Typography>
            
            <FormGroup>
              {availableVariations.map((variation) => (
                <FormControlLabel
                  key={variation.id}
                  control={
                    <Checkbox
                      checked={selectedVariations.some(v => v.id === variation.id)}
                      onChange={() => handleVariationToggle(variation)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">{variation.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {variation.description}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </FormGroup>
          </CardContent>
        </Card>
      </Box>

      {selectedVariations.length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Selected {selectedVariations.length} variation(s): {selectedVariations.map(v => v.name).join(', ')}
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

export default Step2DataFiltering; 