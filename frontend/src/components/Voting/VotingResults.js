import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Avatar,
  LinearProgress,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Person as PersonIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  BarChart as ChartIcon,
  PieChart as PieIcon,
  Timeline as TimelineIcon,
  Verified as VerifiedIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  EnergySavingsLeaf as EcoIcon,
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { toast } from 'react-toastify';
import web3Service from '../../services/web3Service';
import apiService from '../../services/apiService';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const VotingResults = () => {
  const [results, setResults] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [turnoutPercentage, setTurnoutPercentage] = useState(0);
  const [votingStats, setVotingStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [chartType, setChartType] = useState('bar'); // 'bar', 'doughnut', 'timeline'
  const [timelineData, setTimelineData] = useState([]);
  const [constituencyStats, setConstituencyStats] = useState([]);

  // Mock data for demonstration
  const mockResults = [
    {
      id: 1,
      name: 'Alice Johnson',
      party: 'Green Progressive Party',
      avatar: '/avatars/alice.jpg',
      votes: 1247,
      percentage: 42.3,
      trend: 'up',
      trendValue: 2.1,
      constituencies: [
        { name: 'District A', votes: 423, percentage: 45.2 },
        { name: 'District B', votes: 389, percentage: 41.8 },
        { name: 'District C', votes: 435, percentage: 40.1 }
      ]
    },
    {
      id: 2,
      name: 'Robert Chen',
      party: 'Innovation Forward',
      avatar: '/avatars/robert.jpg',
      votes: 987,
      percentage: 33.5,
      trend: 'down',
      trendValue: -1.3,
      constituencies: [
        { name: 'District A', votes: 298, percentage: 31.8 },
        { name: 'District B', votes: 356, percentage: 38.2 },
        { name: 'District C', votes: 333, percentage: 30.7 }
      ]
    },
    {
      id: 3,
      name: 'Maria Rodriguez',
      party: 'Community First',
      avatar: '/avatars/maria.jpg',
      votes: 712,
      percentage: 24.2,
      trend: 'up',
      trendValue: 0.8,
      constituencies: [
        { name: 'District A', votes: 215, percentage: 23.0 },
        { name: 'District B', votes: 187, percentage: 20.0 },
        { name: 'District C', votes: 310, percentage: 29.2 }
      ]
    }
  ];

  const mockTimelineData = [
    { time: '09:00', alice: 156, robert: 134, maria: 89 },
    { time: '10:00', alice: 298, robert: 245, maria: 167 },
    { time: '11:00', alice: 445, robert: 378, maria: 234 },
    { time: '12:00', alice: 623, robert: 512, maria: 345 },
    { time: '13:00', alice: 789, robert: 634, maria: 456 },
    { time: '14:00', alice: 934, robert: 756, maria: 567 },
    { time: '15:00', alice: 1089, robert: 823, maria: 634 },
    { time: '16:00', alice: 1247, robert: 987, maria: 712 }
  ];

  useEffect(() => {
    loadResults();
    
    if (autoRefresh) {
      const interval = setInterval(loadResults, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadResults = async () => {
    try {
      setLoading(true);
      
      // Load voting results
      setResults(mockResults);
      setTimelineData(mockTimelineData);
      
      // Calculate totals
      const total = mockResults.reduce((sum, candidate) => sum + candidate.votes, 0);
      setTotalVotes(total);
      
      // Mock turnout calculation (assuming 5000 eligible voters)
      const eligibleVoters = 5000;
      setTurnoutPercentage((total / eligibleVoters) * 100);
      
      // Load additional stats
      const stats = await apiService.getVotingStats();
      setVotingStats(stats);
      
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Error loading results:', error);
      toast.error('Failed to load voting results');
    } finally {
      setLoading(false);
    }
  };

  const handleExportResults = async () => {
    try {
      const blob = await apiService.exportResults();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voting-results-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Results exported successfully');
    } catch (error) {
      console.error('Error exporting results:', error);
      toast.error('Failed to export results');
    }
  };

  const handleShareResults = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'BlockVote Results',
          text: `Current voting results: ${results[0]?.name} leading with ${results[0]?.percentage}%`,
          url: window.location.href
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      const shareText = `BlockVote Results: ${results[0]?.name} leading with ${results[0]?.percentage}% - ${window.location.href}`;
      navigator.clipboard.writeText(shareText);
      toast.success('Results link copied to clipboard');
    }
  };

  const getChartData = () => {
    if (chartType === 'bar') {
      return {
        labels: results.map(r => r.name),
        datasets: [
          {
            label: 'Votes',
            data: results.map(r => r.votes),
            backgroundColor: [
              'rgba(76, 175, 80, 0.8)',
              'rgba(33, 150, 243, 0.8)',
              'rgba(255, 152, 0, 0.8)'
            ],
            borderColor: [
              'rgba(76, 175, 80, 1)',
              'rgba(33, 150, 243, 1)',
              'rgba(255, 152, 0, 1)'
            ],
            borderWidth: 2
          }
        ]
      };
    } else if (chartType === 'doughnut') {
      return {
        labels: results.map(r => r.name),
        datasets: [
          {
            data: results.map(r => r.votes),
            backgroundColor: [
              'rgba(76, 175, 80, 0.8)',
              'rgba(33, 150, 243, 0.8)',
              'rgba(255, 152, 0, 0.8)'
            ],
            borderColor: [
              'rgba(76, 175, 80, 1)',
              'rgba(33, 150, 243, 1)',
              'rgba(255, 152, 0, 1)'
            ],
            borderWidth: 2
          }
        ]
      };
    } else {
      return {
        labels: timelineData.map(d => d.time),
        datasets: [
          {
            label: 'Alice Johnson',
            data: timelineData.map(d => d.alice),
            borderColor: 'rgba(76, 175, 80, 1)',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            tension: 0.4
          },
          {
            label: 'Robert Chen',
            data: timelineData.map(d => d.robert),
            borderColor: 'rgba(33, 150, 243, 1)',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            tension: 0.4
          },
          {
            label: 'Maria Rodriguez',
            data: timelineData.map(d => d.maria),
            borderColor: 'rgba(255, 152, 0, 1)',
            backgroundColor: 'rgba(255, 152, 0, 0.1)',
            tension: 0.4
          }
        ]
      };
    }
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: chartType === 'timeline' ? 'Vote Timeline' : 'Current Results'
      }
    },
    scales: chartType !== 'doughnut' ? {
      y: {
        beginAtZero: true
      }
    } : undefined
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                📊 Live Voting Results
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Real-time blockchain-verified results
              </Typography>
              {lastUpdated && (
                <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </Typography>
              )}
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Chip icon={<VerifiedIcon />} label="Blockchain Verified" color="primary" />
                <Chip icon={<SecurityIcon />} label="Tamper Proof" color="success" />
                <Chip icon={<SpeedIcon />} label="Real-time" color="info" />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {totalVotes.toLocaleString()} Total Votes
              </Typography>
              <Typography variant="body1">
                {turnoutPercentage.toFixed(1)}% Turnout
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    color="primary"
                  />
                }
                label="Auto Refresh"
              />
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadResults}
                disabled={loading}
              >
                Refresh
              </Button>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Bar Chart">
                <IconButton
                  color={chartType === 'bar' ? 'primary' : 'default'}
                  onClick={() => setChartType('bar')}
                >
                  <ChartIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Pie Chart">
                <IconButton
                  color={chartType === 'doughnut' ? 'primary' : 'default'}
                  onClick={() => setChartType('doughnut')}
                >
                  <PieIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Timeline">
                <IconButton
                  color={chartType === 'timeline' ? 'primary' : 'default'}
                  onClick={() => setChartType('timeline')}
                >
                  <TimelineIcon />
                </IconButton>
              </Tooltip>
              <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExportResults}
                size="small"
              >
                Export
              </Button>
              <Button
                variant="outlined"
                startIcon={<ShareIcon />}
                onClick={handleShareResults}
                size="small"
              >
                Share
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Chart Visualization */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: 400 }}>
            <CardContent sx={{ height: '100%' }}>
              <Box sx={{ height: '100%', position: 'relative' }}>
                {chartType === 'bar' && <Bar data={getChartData()} options={chartOptions} />}
                {chartType === 'doughnut' && <Doughnut data={getChartData()} options={chartOptions} />}
                {chartType === 'timeline' && <Line data={getChartData()} options={chartOptions} />}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12} lg={4}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <EcoIcon sx={{ mr: 1, color: 'success.main' }} />
                    Energy Efficiency
                  </Typography>
                  <Typography variant="h4" color="success.main" sx={{ fontWeight: 600 }}>
                    95.2%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Energy saved vs traditional systems
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={95.2} 
                    color="success"
                    sx={{ mt: 1, height: 8, borderRadius: 4 }}
                  />
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Leading Candidate
                  </Typography>
                  {results[0] && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar src={results[0].avatar} sx={{ width: 48, height: 48, mr: 2 }}>
                        <PersonIcon />
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {results[0].name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {results[0].party}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          <Typography variant="h5" color="primary" sx={{ fontWeight: 600, mr: 1 }}>
                            {results[0].percentage}%
                          </Typography>
                          <Chip
                            icon={results[0].trend === 'up' ? <TrendingUpIcon /> : <TrendingDownIcon />}
                            label={`${results[0].trend === 'up' ? '+' : ''}${results[0].trendValue}%`}
                            color={results[0].trend === 'up' ? 'success' : 'error'}
                            size="small"
                          />
                        </Box>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Detailed Results Table */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Detailed Results
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Rank</TableCell>
                      <TableCell>Candidate</TableCell>
                      <TableCell>Party</TableCell>
                      <TableCell align="right">Votes</TableCell>
                      <TableCell align="right">Percentage</TableCell>
                      <TableCell align="right">Trend</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.map((candidate, index) => (
                      <TableRow key={candidate.id} hover>
                        <TableCell>
                          <Typography variant="h6" color="primary">
                            #{index + 1}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar src={candidate.avatar} sx={{ width: 40, height: 40, mr: 2 }}>
                              <PersonIcon />
                            </Avatar>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {candidate.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {candidate.party}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {candidate.votes.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ minWidth: 120 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                              {candidate.percentage}%
                            </Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={candidate.percentage} 
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            icon={candidate.trend === 'up' ? <TrendingUpIcon /> : <TrendingDownIcon />}
                            label={`${candidate.trend === 'up' ? '+' : ''}${candidate.trendValue}%`}
                            color={candidate.trend === 'up' ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          {index === 0 && (
                            <Chip
                              icon={<VerifiedIcon />}
                              label="Leading"
                              color="primary"
                              size="small"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Constituency Breakdown */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Constituency Breakdown
              </Typography>
              <Grid container spacing={2}>
                {results.map((candidate) => (
                  <Grid item xs={12} md={4} key={candidate.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                          {candidate.name}
                        </Typography>
                        {candidate.constituencies.map((constituency, index) => (
                          <Box key={index} sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2">
                                {constituency.name}
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {constituency.votes} ({constituency.percentage}%)
                              </Typography>
                            </Box>
                            <LinearProgress 
                              variant="determinate" 
                              value={constituency.percentage} 
                              sx={{ height: 4, borderRadius: 2 }}
                            />
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* System Status */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            System Status
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Alert severity="success" variant="outlined">
                <Typography variant="body2">
                  <strong>Blockchain Status:</strong> Active
                </Typography>
              </Alert>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Alert severity="info" variant="outlined">
                <Typography variant="body2">
                  <strong>Network:</strong> Ethereum Mainnet
                </Typography>
              </Alert>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Alert severity="success" variant="outlined">
                <Typography variant="body2">
                  <strong>Gas Price:</strong> 15 Gwei
                </Typography>
              </Alert>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Alert severity="success" variant="outlined">
                <Typography variant="body2">
                  <strong>Uptime:</strong> 99.9%
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default VotingResults;