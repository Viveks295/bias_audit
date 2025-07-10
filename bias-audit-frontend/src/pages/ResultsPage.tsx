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
  AreaChart,
  Area,
  Cell,
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
  const [moments, setMoments] = useState<any[]>([]);
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
        setMoments(auditState.auditResults.moments || []);
        return;
      }
      // Fallback: try to fetch results using session ID
      if (auditState?.sessionId) {
        console.log('ResultsPage: No audit results in state, trying to fetch using sessionId:', auditState.sessionId);
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
          setMoments(response.moments || []);
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

  // Calculate bias_0 mean for each variation
  const variationBiasMeans = results.reduce((acc, result) => {
    if (!acc[result.variation]) {
      acc[result.variation] = {
        variation: result.variation,
        bias_0_mean: 0,
        count: 0
      };
    }
    acc[result.variation].bias_0_mean += result.biasMeasures.bias_0;
    acc[result.variation].count += 1;
    return acc;
  }, {} as Record<string, { variation: string; bias_0_mean: number; count: number }>);

  // Convert to array and calculate means
  const chartData = Object.values(variationBiasMeans).map(item => ({
    variation: item.variation,
    bias_0_mean: item.bias_0_mean / item.count
  }));

  // Kernel Density Estimation function (similar to seaborn's kdeplot)
  const kde = (data: number[], bandwidth: number = 0.1) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;
    const padding = range * 0.1;
    const xMin = min - padding;
    const xMax = max + padding;
    
    // Create evaluation points
    const numPoints = 100;
    const step = (xMax - xMin) / (numPoints - 1);
    const xPoints: number[] = [];
    const yPoints: number[] = [];
    
    for (let i = 0; i < numPoints; i++) {
      const x = xMin + i * step;
      let sum = 0;
      
      // Gaussian kernel
      for (const point of data) {
        sum += Math.exp(-0.5 * Math.pow((x - point) / bandwidth, 2));
      }
      
      const density = sum / (data.length * bandwidth * Math.sqrt(2 * Math.PI));
      xPoints.push(x);
      yPoints.push(density);
    }
    
    return { x: xPoints, y: yPoints };
  };

  // Calculate KDE for bias_0 for each variation
  const createKdeData = () => {
    // Group results by variation
    const variationGroups = results.reduce((acc, result) => {
      if (!acc[result.variation]) {
        acc[result.variation] = [];
      }
      acc[result.variation].push(result.biasMeasures.bias_0);
      return acc;
    }, {} as Record<string, number[]>);

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0', '#ff8042', '#00c49f'];
    const kdeData: any[] = [];

    Object.entries(variationGroups).forEach(([variation, bias0Values], index) => {
      const color = colors[index % colors.length];
      const kdeResult = kde(bias0Values, 0.1); // Adjust bandwidth as needed
      
      kdeResult.x.forEach((x, i) => {
        if (!kdeData[i]) {
          kdeData[i] = { bias_0: x };
        }
        kdeData[i][`${variation}_density`] = kdeResult.y[i];
        kdeData[i][`${variation}_color`] = color;
      });
    });

    return kdeData;
  };

  const kdeData = createKdeData();

  // Compute nice ticks for KDE x-axis
  const getNiceTicks = (min: number, max: number, count: number = 7) => {
    if (min === max) return [min];
    const step = (max - min) / (count - 1);
    const ticks = [];
    for (let i = 0; i < count; i++) {
      ticks.push(Number((min + i * step).toFixed(2)));
    }
    return ticks;
  };

  const kdeMin = kdeData.length > 0 ? Math.min(...kdeData.map(d => d.bias_0)) : 0;
  const kdeMax = kdeData.length > 0 ? Math.max(...kdeData.map(d => d.bias_0)) : 1;
  const kdeTicks = getNiceTicks(kdeMin, kdeMax);

  // Define the color palette for both plots
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0', '#ff8042', '#00c49f'];

  // Map each variation to a color (order based on chartData)
  const variationColorMap: Record<string, string> = {};
  chartData.forEach((item, idx) => {
    variationColorMap[item.variation] = colors[idx % colors.length];
  });

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

  const handleDownloadMoments = async () => {
    if (!moments.length) {
      setError('No moments data available for download');
      return;
    }

    // Create CSV content for moments data
    const headers = Object.keys(moments[0]);
    const csvContent = "data:text/csv;charset=utf-8," + 
      headers.join(",") + "\n" +
      moments.map((row: any) => 
        headers.map(header => row[header]).join(",")
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "audit_moments.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compute summary card values
  const uniqueVariations = Array.from(new Set(results.map(r => r.variation)));
  const numVariations = uniqueVariations.length;
  const textsAnalyzed = numVariations > 0 ? Math.round(results.length / numVariations) : 0;

  // Compute mean bias_0 for each variation
  const variationBias0Means: Record<string, number> = {};
  uniqueVariations.forEach(variation => {
    const vals = results.filter(r => r.variation === variation).map(r => Math.abs(r.biasMeasures.bias_0));
    variationBias0Means[variation] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  });
  const mostSensitiveVariation = Object.entries(variationBias0Means).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

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
              Texts Analyzed
            </Typography>
            <Typography variant="h4">
              {textsAnalyzed}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Total Variations
            </Typography>
            <Typography variant="h4">
              {numVariations}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Most Sensitive Variation
            </Typography>
            <Typography variant="h4">
              {mostSensitiveVariation}
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
      </Box>

      {/* Charts */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3, mb: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Mean Error by Variation
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="variation" />
                <YAxis />
                <Tooltip />
                {/* No Legend here */}
                <Bar dataKey="bias_0_mean" barSize={40} isAnimationActive={false}>
                  {chartData.map((item, idx) => (
                    <Cell key={item.variation} fill={variationColorMap[item.variation]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Distribution of Error
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={kdeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="bias_0" 
                  label={{ value: 'Bias 0', position: 'insideBottom', offset: -5 }}
                  tickFormatter={(value) => Number(value).toFixed(2)}
                  ticks={kdeTicks}
                />
                <YAxis 
                  label={{ value: 'Density', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip />
                <Legend />
                {Object.keys(results.reduce((acc, result) => {
                  acc[result.variation] = true;
                  return acc;
                }, {} as Record<string, boolean>)).map((variation) => (
                  <Area
                    key={variation}
                    type="monotone"
                    dataKey={`${variation}_density`}
                    stroke={kdeData[0]?.[`${variation}_color`] || '#8884d8'}
                    fill={kdeData[0]?.[`${variation}_color`] || '#8884d8'}
                    fillOpacity={0.3}
                    name={variation}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Box>

      {/* Bias Audit Section */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Bias Audit
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadResults}
              >
                Download Raw Results
              </Button>
              {moments.length > 0 && (
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadMoments}
                >
                  Download Bias Audit
                </Button>
              )}
            </Box>
          </Box>
          
          {moments.length > 0 ? (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Variation</TableCell>
                    <TableCell>Magnitude</TableCell>
                    {auditState?.useGrouping && <TableCell>Group</TableCell>}
                    <TableCell>Bias 0 Mean</TableCell>
                    <TableCell>Bias 0 Variance</TableCell>
                    <TableCell>Bias 0 Skewness</TableCell>
                    {auditState?.useAdditionalMeasures && auditState?.selectedMeasures?.includes('bias_1') && (
                      <>
                        <TableCell>Bias 1 Mean</TableCell>
                        <TableCell>Bias 1 Variance</TableCell>
                        <TableCell>Bias 1 Skewness</TableCell>
                      </>
                    )}
                    {auditState?.useAdditionalMeasures && auditState?.selectedMeasures?.includes('bias_2') && (
                      <>
                        <TableCell>Bias 2 Mean</TableCell>
                        <TableCell>Bias 2 Variance</TableCell>
                        <TableCell>Bias 2 Skewness</TableCell>
                      </>
                    )}
                    {auditState?.useAdditionalMeasures && auditState?.selectedMeasures?.includes('bias_3') && (
                      <>
                        <TableCell>Bias 3 Mean</TableCell>
                        <TableCell>Bias 3 Variance</TableCell>
                        <TableCell>Bias 3 Skewness</TableCell>
                      </>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {moments.map((moment: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Chip label={moment.variation} size="small" />
                      </TableCell>
                      <TableCell>{moment.magnitude}</TableCell>
                      {auditState?.useGrouping && <TableCell>{moment.group || '-'}</TableCell>}
                      <TableCell>{moment.bias_0_mean?.toFixed(3) || 'N/A'}</TableCell>
                      <TableCell>{moment.bias_0_var?.toFixed(3) || 'N/A'}</TableCell>
                      <TableCell>{moment.bias_0_skew?.toFixed(3) || 'N/A'}</TableCell>
                      {auditState?.useAdditionalMeasures && auditState?.selectedMeasures?.includes('bias_1') && (
                        <>
                          <TableCell>{moment.bias_1_mean?.toFixed(3) || 'N/A'}</TableCell>
                          <TableCell>{moment.bias_1_var?.toFixed(3) || 'N/A'}</TableCell>
                          <TableCell>{moment.bias_1_skew?.toFixed(3) || 'N/A'}</TableCell>
                        </>
                      )}
                      {auditState?.useAdditionalMeasures && auditState?.selectedMeasures?.includes('bias_2') && (
                        <>
                          <TableCell>{moment.bias_2_mean?.toFixed(3) || 'N/A'}</TableCell>
                          <TableCell>{moment.bias_2_var?.toFixed(3) || 'N/A'}</TableCell>
                          <TableCell>{moment.bias_2_skew?.toFixed(3) || 'N/A'}</TableCell>
                        </>
                      )}
                      {auditState?.useAdditionalMeasures && auditState?.selectedMeasures?.includes('bias_3') && (
                        <>
                          <TableCell>{moment.bias_3_mean?.toFixed(3) || 'N/A'}</TableCell>
                          <TableCell>{moment.bias_3_var?.toFixed(3) || 'N/A'}</TableCell>
                          <TableCell>{moment.bias_3_skew?.toFixed(3) || 'N/A'}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No moments data available. This may be because the audit was run without additional measures or moments.
              </Typography>
            </Box>
          )}
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