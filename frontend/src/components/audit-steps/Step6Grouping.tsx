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
  Alert,
  Tooltip,
} from '@mui/material';
import { AuditState } from '../../types';
import { auditAPI } from '../../services/api';

interface Step6GroupingProps {
  auditState: AuditState;
  onComplete: (data: Partial<AuditState>) => void;
  onFinish: (updatedAuditState?: Partial<AuditState>) => void;
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
  const [notificationEmail, setNotificationEmail] = useState<string | null>(auditState.notificationEmail || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailRegistered, setEmailRegistered] = useState(false);

  const handleGroupingChange = (value: string) => {
    setUseGrouping(value === 'true');
    if (value === 'false') {
      setGroupingVariable(null);
    }
  };

  const handleFinish = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Prepare audit request
      const auditRequest = {
        auditState: {
          ...auditState,
          useGrouping,
          groupingVariable,
          notificationEmail, 
        },
        data: auditState.uploadedFile || undefined,
        modelScript: auditState.customModelFile || undefined,
      };
      
      // Call the real audit API
      const response = await auditAPI.startAudit(auditRequest);
      
      console.log('Step6Grouping: Audit response received:', response);
      
      // Store the session ID and results
      const updatedAuditState = {
        useGrouping,
        groupingVariable,
        notificationEmail,
        auditResults: response,
        sessionId: response.sessionId,
      };
      
      onComplete(updatedAuditState);
      setIsGenerating(false);
      
      // Show success message if email was provided
      if (notificationEmail) {
        setEmailRegistered(true);
        setTimeout(() => {
          onFinish(updatedAuditState);
        }, 2000); // Show message for 2 seconds
      } else {
        onFinish(updatedAuditState);
      }
    } catch (err) {
      console.error('Audit failed:', err);
      setError(err instanceof Error ? err.message : 'Audit failed. Please try again.');
      setIsGenerating(false);
    }
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
            Email Notification (Optional)
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Get notified when your audit is complete. We'll send you a link to view your results.
          </Typography>
          
          <TextField
            label="Email Address"
            type="email"
            value={notificationEmail || ''}
            onChange={(e) => setNotificationEmail(e.target.value)}
            helperText="Enter your email to receive a notification when the audit is ready"
            fullWidth
            placeholder="your.email@example.com"
          />
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
              <strong>Variations:</strong> {auditState.selectedVariations.map(v => {
                const magnitude = auditState.variationMagnitudes[v.id] || v.defaultMagnitude;
                return `${v.name} (${magnitude})`;
              }).join(', ')}
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

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Success Message */}
      {emailRegistered && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Email notification registered! You'll receive a link to your results when the audit is complete.
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
              onClick={handleFinish}
              disabled={!canProceed || isGenerating}
              startIcon={isGenerating ? <CircularProgress size={20} /> : null}
            >
              {isGenerating ? 'Generating Report...' : 'Generate Final Report'}
            </Button>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default Step6Grouping; 