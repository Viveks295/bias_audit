import React from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Paper,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  Science,
  Assessment,
  TrendingUp,
  Security,
  PlayArrow,
} from '@mui/icons-material';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Science sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'LLM Assessment',
      description: 'Evaluate your language model\'s performance and identify potential biases in grading systems.',
    },
    {
      icon: <Assessment sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Text Variations',
      description: 'Apply linguistic variations like spelling errors, Spanglish, and noun transfers to test model robustness.',
    },
    {
      icon: <TrendingUp sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Bias Analysis',
      description: 'Comprehensive analysis of how text variations affect model predictions and identify systematic biases.',
    },
    {
      icon: <Security sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Fairness Metrics',
      description: 'Multiple bias measures and statistical moments to quantify fairness across different demographic groups.',
    },
  ];

  const processSteps = [
    {
      step: 1,
      title: 'LLM Setup & Assessment',
      description: 'Choose your model, define outcome type, and assess initial performance.',
    },
    {
      step: 2,
      title: 'Data Filtering & Variations',
      description: 'Apply score cutoffs and select linguistic variations to test.',
    },
    {
      step: 3,
      title: 'Validation & Sampling',
      description: 'Validate variations and sample audit results.',
    },
    {
      step: 4,
      title: 'Additional Measures',
      description: 'Choose additional bias measures and statistical moments.',
    },
    {
      step: 5,
      title: 'Magnitude Selection',
      description: 'Set variation magnitudes and optional grouping variables.',
    },
    {
      step: 6,
      title: 'Final Report',
      description: 'Generate comprehensive audit report with bias analysis.',
    },
  ];

  return (
    <Container maxWidth="lg">
      {/* Hero Section */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          AI Bias Audit Framework
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph sx={{ mb: 4 }}>
          A comprehensive framework for auditing bias in AI grading models through systematic text variation analysis
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<PlayArrow />}
          onClick={() => navigate('/audit')}
          sx={{ px: 4, py: 1.5, fontSize: '1.1rem' }}
        >
          Start Your Audit
        </Button>
      </Box>

      {/* Features Grid */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
          Key Features
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3 }}>
          {features.map((feature, index) => (
            <Card key={index} sx={{ height: '100%', textAlign: 'center' }}>
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  {feature.icon}
                </Box>
                <Typography variant="h6" component="h3" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      {/* Process Steps */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
          Audit Process
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
          {processSteps.map((step, index) => (
            <Paper key={index} sx={{ p: 3, height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    mr: 2,
                  }}
                >
                  {step.step}
                </Box>
                <Typography variant="h6" component="h3">
                  {step.title}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {step.description}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>

      {/* CTA Section */}
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h5" gutterBottom>
          Ready to audit your AI model?
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Follow our systematic framework to identify and quantify bias in your language model.
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/audit')}
          sx={{ px: 4, py: 1.5 }}
        >
          Begin Audit Process
        </Button>
      </Box>
    </Container>
  );
};

export default HomePage; 