import React, { useState, useEffect } from 'react';
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
  CircularProgress,
  Alert,
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
import { auditAPI } from '../services/api';
import DownloadIcon from '@mui/icons-material/Download';

const ResultsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const auditState: AuditState = location.state?.auditState;
  
  const [results, setResults] = useState<AuditResult[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadResults = async () => {
      console.log('ResultsPage: auditState received:', auditState);
      
      // First, try to use results from the audit response (most common case)
      if (auditState?.auditResults) {
        console.log('ResultsPage: Using audit results from response');
        setResults(auditState.auditResults.results);
        setSummary(auditState.auditResults.summary);
        return;
      }

      // Fallback: try to fetch results using session ID
      if (auditState?.sessionId) {
        console.log('ResultsPage: No audit results in state, trying to fetch using sessionId:', auditState.sessionId);
        
        // Check if this looks like a CSV session ID (csv_*) instead of an audit session ID (audit_*)
        if (auditState.sessionId.startsWith('csv_')) {
          console.log('ResultsPage: Detected CSV session ID, this indicates a session ID mismatch');
          setError('Session ID mismatch detected. Please complete the audit process again.');
          return;
        }
        
        setLoading(true);
        try {
          const response = await auditAPI.getResults(auditState.sessionId);
          setResults(response.results);
          setSummary(response.summary);
        } catch (err) {
          console.error('Failed to load results:', err);
          setError(err instanceof Error ? err.message : 'Failed to load audit results');
        } finally {
          setLoading(false);
        }
        return;
      }

      // No results available
      console.log('ResultsPage: No audit results or session ID found');
      setError('No audit results found');
    };

    loadResults();
  }, [auditState]);

  const chartData = results.map(result => ({
    variation: result.variation,
    difference: result.difference,
    bias_1: result.biasMeasures.bias_1,
    bias_2: result.biasMeasures.bias_2,
    bias_3: result.biasMeasures.bias_3,
  }));

  const handleDownloadResults = async () => {
    if (!auditState?.sessionId) {
      // Fallback to client-side download if no session ID
      const csvContent = "data:text/csv;charset=utf-8," + 
        "Variation,Magnitude,Original Grade,Perturbed Grade,Difference,Bias_0,Bias_1,Bias_2,Bias_3,Group\n" +
        results.map((r: AuditResult) => 
          `${r.variation},${r.magnitude},${r.originalGrade},${r.perturbedGrade},${r.difference},${r.biasMeasures.bias_0},${r.biasMeasures.bias_1},${r.biasMeasures.bias_2},${r.biasMeasures.bias_3},${r.group || ''}`
        ).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "audit_results.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    try {
      const blob = await auditAPI.downloadResults(auditState.sessionId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit_results_${auditState.sessionId}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to download results');
    }
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

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Loading Audit Results...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
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
              {summary?.totalVariations || results.length}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Average Grade Change
            </Typography>
            <Typography variant="h4" color="error.main">
              {summary?.averageGradeChange?.toFixed(1) || 'N/A'}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Max Bias Measure
            </Typography>
            <Typography variant="h4" color="warning.main">
              {summary?.maxBiasMeasure?.toFixed(3) || 'N/A'}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Groups Analyzed
            </Typography>
            <Typography variant="h4">
              {summary?.groupsAnalyzed || 1}
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
                {results.map((result: AuditResult, index: number) => (
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
                    <TableCell>{result.group || '-'}</TableCell>
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