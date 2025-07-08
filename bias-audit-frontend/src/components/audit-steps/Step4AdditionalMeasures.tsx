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
  Checkbox,
  FormGroup,
} from '@mui/material';
import { AuditState } from '../../types';

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

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Step 4: Additional Measures
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Choose additional bias measures and statistical moments for comprehensive analysis.
      </Typography>

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

      {useAdditionalMeasures && (
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
                {availableMoments.map((moment) => (
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
                ))}
              </FormGroup>
            )}
          </CardContent>
        </Card>
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

export default Step4AdditionalMeasures; 