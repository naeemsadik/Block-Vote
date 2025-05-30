import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  HowToVote as VoteIcon,
  Assessment as ResultsIcon,
  EnergySavingsLeaf as EcoIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  People as PeopleIcon,
  Timeline as TimelineIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';
import { toast } from 'react-toastify';

// Services
import { apiService } from '../services/apiService';
import { web3Service } from '../services/web3Service';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement,
  BarElement
);

const Dashboard = ({ userRole = 'voter' }) => {
  const [loading, setLoading] = useState(true);
  const [systemHealth, setSystemHealth] = useState(null);
  const [energyMetrics, setEnergyMetrics] = useState(null);
  const [votingStats, setVotingStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [networkStats, setNetworkStats] = useState(null);
  const [walletInfo, setWalletInfo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [userRole]);

  const loadDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setRefreshing(true);

      // Load data in parallel
      const [health, energy, stats, activity, network] = await Promise.allSettled([
        apiService.getSystemHealth(),
        apiService.getEnergyMetrics(),
        getVotingStats(),
        getRecentActivity(),
        apiService.getNetworkStats(),
      ]);

      // Process results
      if (health.status === 'fulfilled') {
        setSystemHealth(health.value);
      }

      if (energy.status === 'fulfilled') {
        setEnergyMetrics(energy.value);
      }

      if (stats.status === 'fulfilled') {
        setVotingStats(stats.value);
      }

      if (activity.status === 'fulfilled') {
        setRecentActivity(activity.value);
      }

      if (network.status === 'fulfilled') {
        setNetworkStats(network.value);
      }

      // Load wallet info if connected
      if (web3Service.isConnected()) {
        const account = web3Service.getCurrentAccount();
        const balance = await web3Service.getBalance(account);
        const hasVoted = await web3Service.hasVoted();
        
        setWalletInfo({
          address: account,
          balance,
          hasVoted,
        });
      }

      if (!silent) {
        console.log('📊 Dashboard data loaded successfully');
      }
    } catch (error) {
      console.error('❌ Failed to load dashboard data:', error);
      if (!silent) {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getVotingStats = async () => {
    // Mock data - in real implementation, this would aggregate from multiple sources
    return {
      totalVotes: 125847,
      totalVoters: 1250000,
      turnoutPercentage: 10.07,
      activeConstituencies: 543,
      completedConstituencies: 12,
      votingProgress: 15.2,
    };
  };

  const getRecentActivity = async () => {
    // Mock data - in real implementation, this would come from audit logs
    return [
      {
        id: 1,
        type: 'vote',
        message: 'New vote cast in Constituency 42',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        status: 'success',
      },
      {
        id: 2,
        type: 'batch',
        message: 'Batch processed for Division 8',
        timestamp: new Date(Date.now() - 12 * 60 * 1000),
        status: 'success',
      },
      {
        id: 3,
        type: 'energy',
        message: 'Energy efficiency improved by 2.3%',
        timestamp: new Date(Date.now() - 25 * 60 * 1000),
        status: 'info',
      },
      {
        id: 4,
        type: 'audit',
        message: 'Security audit completed',
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        status: 'success',
      },
    ];
  };

  const handleRefresh = () => {
    loadDashboardData();
    toast.info('Dashboard refreshed');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
      case 'online':
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
      case 'offline':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
      case 'online':
      case 'success':
        return <CheckCircleIcon />;
      case 'warning':
        return <WarningIcon />;
      case 'error':
      case 'offline':
        return <ErrorIcon />;
      default:
        return <CheckCircleIcon />;
    }
  };

  // Chart configurations
  const energyChartData = {
    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
    datasets: [
      {
        label: 'Energy Consumption (kWh)',
        data: [12, 8, 15, 22, 18, 14],
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const votingProgressData = {
    labels: ['Voted', 'Pending'],
    datasets: [
      {
        data: [votingStats?.totalVotes || 0, (votingStats?.totalVoters || 0) - (votingStats?.totalVotes || 0)],
        backgroundColor: ['#4caf50', '#e0e0e0'],
        borderWidth: 0,
      },
    ],
  };

  const constituencyData = {
    labels: ['Active', 'Completed', 'Pending'],
    datasets: [
      {
        label: 'Constituencies',
        data: [
          votingStats?.activeConstituencies || 0,
          votingStats?.completedConstituencies || 0,
          543 - (votingStats?.activeConstituencies || 0) - (votingStats?.completedConstituencies || 0),
        ],
        backgroundColor: ['#2196f3', '#4caf50', '#ff9800'],
      },
    ],
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Loading Dashboard...
        </Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DashboardIcon color="primary" />
            BlockVote Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Green Computing Hierarchical Voting System
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh Dashboard">
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <RefreshIcon className={refreshing ? 'animate-spin' : ''} />
            </IconButton>
          </Tooltip>
          <Chip
            label={userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            color="primary"
            variant="outlined"
          />
        </Box>
      </Box>

      {/* System Status Alert */}
      {systemHealth && (
        <Alert
          severity={getStatusColor(systemHealth.status)}
          icon={getStatusIcon(systemHealth.status)}
          sx={{ mb: 3 }}
        >
          System Status: {systemHealth.status} - {systemHealth.message}
        </Alert>
      )}

      {/* Main Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Total Votes */}
        <Grid item xs={12} sm={6} md={3}>
          <Card className="card">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Votes
                  </Typography>
                  <Typography variant="h4">
                    {votingStats?.totalVotes?.toLocaleString() || '0'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <TrendingUpIcon color="success" fontSize="small" />
                    <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                      +12.5% from last hour
                    </Typography>
                  </Box>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <VoteIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Voter Turnout */}
        <Grid item xs={12} sm={6} md={3}>
          <Card className="card">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Voter Turnout
                  </Typography>
                  <Typography variant="h4">
                    {votingStats?.turnoutPercentage?.toFixed(1) || '0'}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={votingStats?.turnoutPercentage || 0}
                    sx={{ mt: 1, height: 6, borderRadius: 3 }}
                  />
                </Box>
                <Avatar sx={{ bgcolor: 'secondary.main' }}>
                  <PeopleIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Energy Efficiency */}
        <Grid item xs={12} sm={6} md={3}>
          <Card className="card">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Energy Saved
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    95.2%
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <Chip
                      label="Eco-Friendly"
                      size="small"
                      color="success"
                      className="eco-badge"
                    />
                  </Box>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <EcoIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* System Performance */}
        <Grid item xs={12} sm={6} md={3}>
          <Card className="card">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Performance
                  </Typography>
                  <Typography variant="h4">
                    {networkStats?.averageResponseTime || '1.2'}s
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <TrendingDownIcon color="success" fontSize="small" />
                    <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                      -0.3s improved
                    </Typography>
                  </Box>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <SpeedIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts and Details Grid */}
      <Grid container spacing={3}>
        {/* Energy Consumption Chart */}
        <Grid item xs={12} md={6}>
          <Card className="card">
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EcoIcon color="success" />
                Energy Consumption (24h)
              </Typography>
              <Box sx={{ height: 300 }}>
                <Line
                  data={energyChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                      },
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Voting Progress */}
        <Grid item xs={12} md={6}>
          <Card className="card">
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VoteIcon color="primary" />
                Voting Progress
              </Typography>
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Doughnut
                  data={votingProgressData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                      },
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Constituency Status */}
        <Grid item xs={12} md={6}>
          <Card className="card">
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimelineIcon color="secondary" />
                Constituency Status
              </Typography>
              <Box sx={{ height: 300 }}>
                <Bar
                  data={constituencyData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                      },
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Card className="card">
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon color="info" />
                Recent Activity
              </Typography>
              <List>
                {recentActivity.map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <ListItem>
                      <ListItemIcon>
                        {getStatusIcon(activity.status)}
                      </ListItemIcon>
                      <ListItemText
                        primary={activity.message}
                        secondary={activity.timestamp.toLocaleTimeString()}
                      />
                    </ListItem>
                    {index < recentActivity.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Wallet Info (if connected) */}
        {walletInfo && (
          <Grid item xs={12}>
            <Card className="card">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Wallet Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">
                      Address
                    </Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                      {web3Service.formatAddress(walletInfo.address)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">
                      Balance
                    </Typography>
                    <Typography variant="body1">
                      {parseFloat(walletInfo.balance).toFixed(4)} ETH
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">
                      Voting Status
                    </Typography>
                    <Chip
                      label={walletInfo.hasVoted ? 'Voted' : 'Not Voted'}
                      color={walletInfo.hasVoted ? 'success' : 'default'}
                      size="small"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Quick Actions */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<VoteIcon />}
          href="/vote"
          disabled={walletInfo?.hasVoted}
        >
          {walletInfo?.hasVoted ? 'Already Voted' : 'Cast Vote'}
        </Button>
        <Button
          variant="outlined"
          startIcon={<ResultsIcon />}
          href="/results"
        >
          View Results
        </Button>
        <Button
          variant="outlined"
          startIcon={<EcoIcon />}
          href="/energy"
        >
          Energy Dashboard
        </Button>
        {(userRole === 'admin' || userRole === 'validator') && (
          <Button
            variant="outlined"
            startIcon={<SecurityIcon />}
            href="/audit"
          >
            Audit Trail
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default Dashboard;