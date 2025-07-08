import React from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { AuditState, AuditResult } from '../types';
import DownloadIcon from '@mui/icons-material/Download';

const ResultsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const auditState: AuditState = location.state?.auditState;

  // Mock data for demonstration
  const mockResults: AuditResult[] = [
    {
      variation: 'spelling',
      magnitude: 30,
      originalGrade: 85,
      perturbedGrade: 78,
      difference: -7,
      biasMeasures: {
        bias_0: -7,
        bias_1: -0.23,
        bias_2: -0.15,
        bias_3: -0.47,
      },
      group: 'Group A',
    },
    {
      variation: 'spanglish',
      magnitude: 50,
      originalGrade: 85,
      perturbedGrade: 72,
      difference: -13,
      biasMeasures: {
        bias_0: -13,
        bias_1: -0.26,
        bias_2: -0.18,
        bias_3: -0.87,
      },
      group: 'Group A',
    },
    {
      variation: 'noun_transfer',
      magnitude: 40,
      originalGrade: 85,
      perturbedGrade: 80,
      difference: -5,
      biasMeasures: {
        bias_0: -5,
        bias_1: -0.13,
        bias_2: -0.08,
        bias_3: -0.33,
      },
      group: 'Group A',
    },
  ];

  const chartData = mockResults.map(result => ({
    variation: result.variation,
    difference: result.difference,
    bias_1: result.biasMeasures.bias_1,
    bias_2: result.biasMeasures.bias_2,
    bias_3: result.biasMeasures.bias_3,
  }));

  const handleDownloadResults = () => {
    // Simulate download
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Variation,Magnitude,Original Grade,Perturbed Grade,Difference,Bias_0,Bias_1,Bias_2,Bias_3,Group\n" +
      mockResults.map(r => 
        `${r.variation},${r.magnitude},${r.originalGrade},${r.perturbedGrade},${r.difference},${r.biasMeasures.bias_0},${r.biasMeasures.bias_1},${r.biasMeasures.bias_2},${r.biasMeasures.bias_3},${r.group}`
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "audit_results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!auditState) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h4" gutterBottom>
            No Audit Results Found
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Please complete an audit first to view results.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/audit')}>
            Start New Audit
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Audit Results
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Analysis of bias in your AI model across different linguistic variations
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Total Variations
            </Typography>
            <Typography variant="h4">
              {mockResults.length}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Average Grade Change
            </Typography>
            <Typography variant="h4" color="error.main">
              -8.3
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Max Bias Measure
            </Typography>
            <Typography variant="h4" color="warning.main">
              -0.87
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Groups Analyzed
            </Typography>
            <Typography variant="h4">
              1
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Charts */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3, mb: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Grade Changes by Variation
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="variation" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="difference" fill="#8884d8" name="Grade Change" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Bias Measures Comparison
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="variation" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="bias_1" stroke="#8884d8" name="Bias 1" />
                <Line type="monotone" dataKey="bias_2" stroke="#82ca9d" name="Bias 2" />
                <Line type="monotone" dataKey="bias_3" stroke="#ffc658" name="Bias 3" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Box>

      {/* Results Table */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Detailed Results
            </Typography>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadResults}
            >
              Download CSV
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Variation</TableCell>
                  <TableCell>Magnitude</TableCell>
                  <TableCell>Original Grade</TableCell>
                  <TableCell>Perturbed Grade</TableCell>
                  <TableCell>Difference</TableCell>
                  <TableCell>Bias Measures</TableCell>
                  <TableCell>Group</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mockResults.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Chip label={result.variation} size="small" />
                    </TableCell>
                    <TableCell>{result.magnitude}</TableCell>
                    <TableCell>{result.originalGrade}</TableCell>
                    <TableCell>{result.perturbedGrade}</TableCell>
                    <TableCell>
                      <Typography
                        color={result.difference < 0 ? 'error.main' : 'success.main'}
                      >
                        {result.difference > 0 ? '+' : ''}{result.difference}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="caption" display="block">
                          B1: {result.biasMeasures.bias_1.toFixed(3)}
                        </Typography>
                        <Typography variant="caption" display="block">
                          B2: {result.biasMeasures.bias_2.toFixed(3)}
                        </Typography>
                        <Typography variant="caption" display="block">
                          B3: {result.biasMeasures.bias_3.toFixed(3)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{result.group}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
        <Button variant="contained" onClick={() => navigate('/audit')}>
          Start New Audit
        </Button>
        <Button variant="outlined" onClick={() => navigate('/')}>
          Back to Home
        </Button>
      </Box>
    </Container>
  );
};

export default ResultsPage; 