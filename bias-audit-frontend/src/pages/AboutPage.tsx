import React from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  CheckCircle,
  Science,
  Security,
  TrendingUp,
  Assessment,
} from '@mui/icons-material';

const AboutPage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          About AI Bias Audit Framework
        </Typography>
        <Typography variant="body1" color="text.secondary">
          A comprehensive framework for systematically auditing bias in AI grading models
        </Typography>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Framework Overview
        </Typography>
        <Typography variant="body1" paragraph>
          The AI Bias Audit Framework provides a systematic approach to identify and quantify bias in language model-based grading systems. 
          By applying controlled linguistic variations to text inputs, the framework measures how these changes affect model predictions, 
          revealing potential biases that could impact different demographic groups or writing styles.
        </Typography>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Key Features
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <Science color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Systematic Variation Application"
              secondary="Apply controlled linguistic variations including spelling errors, Spanglish, noun transfers, and cognates"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <Assessment color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Multiple Bias Measures"
              secondary="Calculate various bias metrics including normalized, feature-weighted, and grade-adjusted measures"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <TrendingUp color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Statistical Analysis"
              secondary="Generate statistical moments (mean, variance, skewness, kurtosis) for comprehensive bias analysis"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <Security color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Group-based Analysis"
              secondary="Analyze bias across different demographic groups or other categorical variables"
            />
          </ListItem>
        </List>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Audit Process
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Step-by-Step Framework
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="1. LLM Setup & Assessment"
                secondary="Choose your model, define outcome type, and assess initial performance"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="2. Data Filtering & Variations"
                secondary="Apply score cutoffs and select linguistic variations to test"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="3. Validation & Sampling"
                secondary="Validate variations and sample audit results"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="4. Additional Measures"
                secondary="Choose additional bias measures and statistical moments"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="5. Magnitude Selection"
                secondary="Set variation magnitudes and optional grouping variables"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="6. Final Report"
                secondary="Generate comprehensive audit report with bias analysis"
              />
            </ListItem>
          </List>
        </Paper>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Linguistic Variations
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Spelling Errors
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Introduce controlled spelling mistakes to test model robustness to common writing errors.
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Spanglish
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Mix Spanish and English words to test bias against bilingual writing styles.
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Noun Transfer
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Replace nouns with semantically similar alternatives to test vocabulary bias.
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cognates
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Use cognate words from other languages to test cross-linguistic bias.
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Bias Measures
        </Typography>
        <Typography variant="body1" paragraph>
          The framework calculates multiple bias measures to provide comprehensive analysis:
        </Typography>
        <List>
          <ListItem>
            <ListItemText
              primary="Bias Measure 0 (B₀)"
              secondary="Raw difference between original and perturbed grades"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Bias Measure 1 (B₁)"
              secondary="Normalized bias measure accounting for variation magnitude"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Bias Measure 2 (B₂)"
              secondary="Feature-weighted bias measure considering text characteristics"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Bias Measure 3 (B₃)"
              secondary="Grade-adjusted bias measure accounting for original grade levels"
            />
          </ListItem>
        </List>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Use Cases
        </Typography>
        <Typography variant="body1" paragraph>
          This framework is particularly useful for:
        </Typography>
        <List>
          <ListItem>
            <ListItemText
              primary="Educational Assessment"
              secondary="Audit AI grading systems for essays and assignments"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Content Moderation"
              secondary="Test bias in content filtering and moderation systems"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Language Processing"
              secondary="Evaluate fairness in natural language processing applications"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Research & Development"
              secondary="Systematically test and improve AI model fairness"
            />
          </ListItem>
        </List>
      </Box>
    </Container>
  );
};

export default AboutPage; 