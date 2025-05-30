import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  EnergySavingsLeaf as EcoIcon,
  BatteryChargingFull as BatteryIcon,
  Speed as SpeedIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  FlashOn as FlashIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  NetworkCheck as NetworkIcon,
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { toast } from 'react-toastify';
import apiService from '../../services/apiService';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

const EnergyMonitor = () => {
  const [energyData, setEnergyData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [optimizationMode, setOptimizationMode] = useState(true);

  // Mock energy data
  const mockEnergyData = {
    currentConsumption: 2.4, // kWh
    dailyConsumption: 45.6,
    weeklyConsumption: 298.4,
    monthlyConsumption: 1247.8,
    efficiency: 95.2,
    carbonFootprint: 0.8, // kg CO2
    energySaved: 2847.3, // kWh saved vs traditional
    costSavings: 341.68, // USD
    renewablePercentage: 87.5,
    peakUsage: 4.2,
    averageUsage: 2.1,
    trend: 'down',
    trendValue: -12.3
  };

  const mockHistoricalData = [
    { time: '00:00', consumption: 1.8, efficiency: 96.1, carbon: 0.6 },
    { time: '04:00', consumption: 1.5, efficiency: 97.2, carbon: 0.5 },
    { time: '08:00', consumption: 2.8, efficiency: 94.8, carbon: 0.9 },
    { time: '12:00', consumption: 3.2, efficiency: 93.5, carbon: 1.1 },
    { time: '16:00', consumption: 2.9, efficiency: 94.2, carbon: 1.0 },
    { time: '20:00', consumption: 2.4, efficiency: 95.2, carbon: 0.8 },
  ];

  const mockSystemMetrics = {
    cpu: { usage: 23.4, temperature: 42, efficiency: 94.2 },
    memory: { usage: 67.8, available: 32.2, efficiency: 91.5 },
    storage: { usage: 45.6, available: 54.4, efficiency: 96.8 },
    network: { throughput: 156.7, latency: 12, efficiency: 98.1 },
    blockchain: { gasUsage: 21000, blockTime: 2.1, efficiency: 97.3 }
  };

  const mockAlerts = [
    {
      id: 1,
      type: 'success',
      title: 'Energy Efficiency Optimized',
      message: 'System automatically reduced power consumption by 8%',
      timestamp: new Date(Date.now() - 300000)
    },
    {
      id: 2,
      type: 'info',
      title: 'Peak Usage Detected',
      message: 'Higher than normal energy usage during voting period',
      timestamp: new Date(Date.now() - 900000)
    },
    {
      id: 3,
      type: 'warning',
      title: 'Carbon Footprint Alert',
      message: 'Daily carbon emissions approaching threshold',
      timestamp: new Date(Date.now() - 1800000)
    }
  ];

  useEffect(() => {
    loadEnergyData();
    
    if (autoRefresh) {
      const interval = setInterval(loadEnergyData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadEnergyData = async () => {
    try {
      setLoading(true);
      
      // Load energy metrics
      setEnergyData(mockEnergyData);
      setHistoricalData(mockHistoricalData);
      setSystemMetrics(mockSystemMetrics);
      setAlerts(mockAlerts);
      
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Error loading energy data:', error);
      toast.error('Failed to load energy monitoring data');
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizationToggle = async (enabled) => {
    try {
      setOptimizationMode(enabled);
      await apiService.updateEnergySettings({ optimizationMode: enabled });
      toast.success(`Energy optimization ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating optimization mode:', error);
      toast.error('Failed to update optimization settings');
    }
  };

  const handleExportReport = async () => {
    try {
      const blob = await apiService.exportEnergyReport();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `energy-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Energy report exported successfully');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export energy report');
    }
  };

  const getChartData = () => {
    return {
      labels: historicalData.map(d => d.time),
      datasets: [
        {
          label: 'Energy Consumption (kWh)',
          data: historicalData.map(d => d.consumption),
          borderColor: 'rgba(76, 175, 80, 1)',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y'
        },
        {
          label: 'Efficiency (%)',
          data: historicalData.map(d => d.efficiency),
          borderColor: 'rgba(33, 150, 243, 1)',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y1'
        },
        {
          label: 'Carbon Footprint (kg CO2)',
          data: historicalData.map(d => d.carbon),
          borderColor: 'rgba(255, 152, 0, 1)',
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y'
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      title: {
        display: true,
        text: 'Energy Consumption & Efficiency Trends (24h)'
      },
      legend: {
        position: 'top',
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time'
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Energy (kWh) / Carbon (kg CO2)'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Efficiency (%)'
        },
        grid: {
          drawOnChartArea: false,
        },
      }
    }
  };

  const getEfficiencyColor = (efficiency) => {
    if (efficiency >= 95) return 'success';
    if (efficiency >= 90) return 'warning';
    return 'error';
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'success': return <CheckIcon />;
      case 'warning': return <WarningIcon />;
      case 'error': return <ErrorIcon />;
      default: return <InfoIcon />;
    }
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
                🌱 Energy Monitor
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Real-time green computing metrics
              </Typography>
              {lastUpdated && (
                <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </Typography>
              )}
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Chip icon={<EcoIcon />} label="Carbon Neutral" color="success" />
                <Chip icon={<BatteryIcon />} label="95% Efficient" color="primary" />
                <Chip icon={<SpeedIcon />} label="Optimized" color="info" />
              </Box>
              {energyData && (
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {energyData.currentConsumption} kWh
                </Typography>
              )}
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
              <FormControlLabel
                control={
                  <Switch
                    checked={optimizationMode}
                    onChange={(e) => handleOptimizationToggle(e.target.checked)}
                    color="success"
                  />
                }
                label="Energy Optimization"
              />
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadEnergyData}
                disabled={loading}
              >
                Refresh
              </Button>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExportReport}
                size="small"
              >
                Export Report
              </Button>
              <IconButton color="primary">
                <SettingsIcon />
              </IconButton>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Key Metrics */}
        <Grid item xs={12} lg={8}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <EcoIcon sx={{ color: 'success.main', mr: 1 }} />
                    <Typography variant="h6">Efficiency</Typography>
                  </Box>
                  <Typography variant="h4" color="success.main" sx={{ fontWeight: 600 }}>
                    {energyData?.efficiency}%
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <TrendingDownIcon sx={{ color: 'success.main', fontSize: 16, mr: 0.5 }} />
                    <Typography variant="body2" color="success.main">
                      +2.1% vs yesterday
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={energyData?.efficiency} 
                    color="success"
                    sx={{ mt: 1, height: 6, borderRadius: 3 }}
                  />
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <FlashIcon sx={{ color: 'primary.main', mr: 1 }} />
                    <Typography variant="h6">Current Usage</Typography>
                  </Box>
                  <Typography variant="h4" color="primary.main" sx={{ fontWeight: 600 }}>
                    {energyData?.currentConsumption} kWh
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <TrendingDownIcon sx={{ color: 'success.main', fontSize: 16, mr: 0.5 }} />
                    <Typography variant="body2" color="success.main">
                      -12.3% vs peak
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={(energyData?.currentConsumption / energyData?.peakUsage) * 100} 
                    color="primary"
                    sx={{ mt: 1, height: 6, borderRadius: 3 }}
                  />
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <EcoIcon sx={{ color: 'warning.main', mr: 1 }} />
                    <Typography variant="h6">Carbon Footprint</Typography>
                  </Box>
                  <Typography variant="h4" color="warning.main" sx={{ fontWeight: 600 }}>
                    {energyData?.carbonFootprint} kg
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    CO2 today
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={20} 
                    color="warning"
                    sx={{ mt: 1, height: 6, borderRadius: 3 }}
                  />
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <BatteryIcon sx={{ color: 'info.main', mr: 1 }} />
                    <Typography variant="h6">Energy Saved</Typography>
                  </Box>
                  <Typography variant="h4" color="info.main" sx={{ fontWeight: 600 }}>
                    {energyData?.energySaved}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    kWh vs traditional
                  </Typography>
                  <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                    ${energyData?.costSavings} saved
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Energy Consumption Chart */}
          <Card sx={{ height: 400 }}>
            <CardContent sx={{ height: '100%' }}>
              <Line data={getChartData()} options={chartOptions} />
            </CardContent>
          </Card>
        </Grid>

        {/* System Metrics & Alerts */}
        <Grid item xs={12} lg={4}>
          {/* System Performance */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <MemoryIcon sx={{ mr: 1 }} />
                System Performance
              </Typography>
              
              {systemMetrics && (
                <Box>
                  {/* CPU */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">CPU Usage</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {systemMetrics.cpu.usage}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={systemMetrics.cpu.usage} 
                      color={systemMetrics.cpu.usage > 80 ? 'error' : 'primary'}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Temp: {systemMetrics.cpu.temperature}°C | Efficiency: {systemMetrics.cpu.efficiency}%
                    </Typography>
                  </Box>
                  
                  {/* Memory */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Memory Usage</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {systemMetrics.memory.usage}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={systemMetrics.memory.usage} 
                      color={systemMetrics.memory.usage > 80 ? 'warning' : 'primary'}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Available: {systemMetrics.memory.available}% | Efficiency: {systemMetrics.memory.efficiency}%
                    </Typography>
                  </Box>
                  
                  {/* Storage */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Storage Usage</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {systemMetrics.storage.usage}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={systemMetrics.storage.usage} 
                      color="success"
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Available: {systemMetrics.storage.available}% | Efficiency: {systemMetrics.storage.efficiency}%
                    </Typography>
                  </Box>
                  
                  {/* Network */}
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Network Throughput</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {systemMetrics.network.throughput} Mbps
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={75} 
                      color="info"
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Latency: {systemMetrics.network.latency}ms | Efficiency: {systemMetrics.network.efficiency}%
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Recent Alerts
              </Typography>
              <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                {alerts.map((alert) => (
                  <Alert 
                    key={alert.id}
                    severity={alert.type}
                    icon={getAlertIcon(alert.type)}
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {alert.title}
                    </Typography>
                    <Typography variant="body2">
                      {alert.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {alert.timestamp.toLocaleTimeString()}
                    </Typography>
                  </Alert>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Detailed Energy Statistics */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Energy Statistics
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Metric</TableCell>
                      <TableCell align="right">Current</TableCell>
                      <TableCell align="right">Daily</TableCell>
                      <TableCell align="right">Weekly</TableCell>
                      <TableCell align="right">Monthly</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <FlashIcon sx={{ mr: 1, color: 'primary.main' }} />
                          Energy Consumption (kWh)
                        </Box>
                      </TableCell>
                      <TableCell align="right">{energyData?.currentConsumption}</TableCell>
                      <TableCell align="right">{energyData?.dailyConsumption}</TableCell>
                      <TableCell align="right">{energyData?.weeklyConsumption}</TableCell>
                      <TableCell align="right">{energyData?.monthlyConsumption}</TableCell>
                      <TableCell align="center">
                        <Chip label="Optimal" color="success" size="small" />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <EcoIcon sx={{ mr: 1, color: 'warning.main' }} />
                          Carbon Footprint (kg CO2)
                        </Box>
                      </TableCell>
                      <TableCell align="right">{energyData?.carbonFootprint}</TableCell>
                      <TableCell align="right">12.4</TableCell>
                      <TableCell align="right">78.6</TableCell>
                      <TableCell align="right">324.2</TableCell>
                      <TableCell align="center">
                        <Chip label="Low" color="success" size="small" />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <BatteryIcon sx={{ mr: 1, color: 'info.main' }} />
                          Renewable Energy (%)
                        </Box>
                      </TableCell>
                      <TableCell align="right">{energyData?.renewablePercentage}%</TableCell>
                      <TableCell align="right">86.2%</TableCell>
                      <TableCell align="right">88.7%</TableCell>
                      <TableCell align="right">85.4%</TableCell>
                      <TableCell align="center">
                        <Chip label="Excellent" color="success" size="small" />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Environmental Impact Summary */}
      <Card sx={{ mt: 3, background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)', color: 'white' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
            🌍 Environmental Impact Summary
          </Typography>
          <Grid container spacing={3} sx={{ textAlign: 'center' }}>
            <Grid item xs={12} sm={3}>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {energyData?.energySaved}
              </Typography>
              <Typography variant="body1">kWh Energy Saved</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                vs Traditional Systems
              </Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                2.1 tons
              </Typography>
              <Typography variant="body1">CO2 Emissions Prevented</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Equivalent to 4,600 miles driven
              </Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                ${energyData?.costSavings}
              </Typography>
              <Typography variant="body1">Cost Savings</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                This month alone
              </Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                3 homes
              </Typography>
              <Typography variant="body1">Powered for a Month</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                With energy saved
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default EnergyMonitor;