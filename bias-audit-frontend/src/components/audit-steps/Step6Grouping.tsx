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
  TextField,
  CircularProgress,
} from '@mui/material';
import { AuditState } from '../../types';

interface Step6GroupingProps {
  auditState: AuditState;
  onComplete: (data: Partial<AuditState>) => void;
  onFinish: () => void;
  onBack: () => void;
}

const Step6Grouping: React.FC<Step6GroupingProps> = ({
  auditState,
  onComplete,
  onFinish,
  onBack,
}) => {
  const [useGrouping, setUseGrouping] = useState<boolean | null>(auditState.useGrouping);
  const [groupingVariable, setGroupingVariable] = useState<string | null>(auditState.groupingVariable);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGroupingChange = (value: string) => {
    setUseGrouping(value === 'true');
    if (value === 'false') {
      setGroupingVariable(null);
    }
  };

  const handleFinish = async () => {
    setIsGenerating(true);
    
    // Simulate audit generation
    setTimeout(() => {
      onComplete({
        useGrouping,
        groupingVariable,
      });
      setIsGenerating(false);
      onFinish();
    }, 3000);
  };

  const canProceed = useGrouping !== null;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Step 6: Grouping & Final Report
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Choose optional grouping variables and generate the final audit report.
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Optional Grouping Variable
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Group your results by demographic or other variables for detailed bias analysis.
          </Typography>
          
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <RadioGroup
              value={useGrouping === null ? '' : useGrouping.toString()}
              onChange={(e) => handleGroupingChange(e.target.value)}
            >
              <FormControlLabel value="true" control={<Radio />} label="Yes, group by variable" />
              <FormControlLabel value="false" control={<Radio />} label="No, analyze all data together" />
            </RadioGroup>
          </FormControl>
          
          {useGrouping && (
            <TextField
              label="Grouping Variable Name"
              value={groupingVariable || ''}
              onChange={(e) => setGroupingVariable(e.target.value)}
              helperText="Enter the column name for grouping (e.g., 'demographic', 'region')"
              fullWidth
              sx={{ mt: 2 }}
            />
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Audit Summary
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Selected LLM:</strong> {auditState.selectedLLM?.name}
            </Typography>
            <Typography variant="body2">
              <strong>Outcome Type:</strong> {auditState.outcomeType}
            </Typography>
            <Typography variant="body2">
              <strong>Performance Metric:</strong> {auditState.selectedMetric?.name}
            </Typography>
            <Typography variant="body2">
              <strong>Variations:</strong> {auditState.selectedVariations.map(v => v.name).join(', ')}
            </Typography>
            <Typography variant="body2">
              <strong>Score Cutoff:</strong> {auditState.useScoreCutoff ? `Yes (${auditState.cutoffScore})` : 'No'}
            </Typography>
            {auditState.useAdditionalMeasures && (
              <Typography variant="body2">
                <strong>Additional Measures:</strong> {auditState.selectedMeasures.join(', ')}
              </Typography>
            )}
            {auditState.useHigherMoments && (
              <Typography variant="body2">
                <strong>Higher Moments:</strong> {auditState.selectedMoments.join(', ')}
              </Typography>
            )}
            {useGrouping && (
              <Typography variant="body2">
                <strong>Grouping Variable:</strong> {groupingVariable}
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button onClick={onBack}>
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleFinish}
          disabled={!canProceed || isGenerating}
          startIcon={isGenerating ? <CircularProgress size={20} /> : null}
        >
          {isGenerating ? 'Generating Report...' : 'Generate Final Report'}
        </Button>
      </Box>
    </Box>
  );
};

export default Step6Grouping; 