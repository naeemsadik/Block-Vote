import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Avatar,
  Tooltip,
  IconButton,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  CheckCircleOutline as CheckCircleIcon,
  ErrorOutline as ErrorIcon,
  WarningAmberOutlined as WarningIcon,
  Dns as DnsIcon, // Server/Service icon
  Storage as StorageIcon, // Database icon
  Link as LinkIcon, // Blockchain Node icon
  CloudQueue as CloudQueueIcon, // API Gateway
  Memory as MemoryIcon, // Memory usage
  Speed as SpeedIcon, // CPU usage
  NetworkCheck as NetworkIcon, // Network status
  Security as SecurityIcon, // Security status
  PowerSettingsNew as PowerIcon, // Energy Service
  Assessment as AssessmentIcon, // Rollup Service
  VerifiedUser as VerifiedUserIcon, // Audit Service
  Refresh as RefreshIcon,
  InfoOutlined, // For general info
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import apiService from '../../services/apiService';
import { formatDistanceToNow } from 'date-fns';

const SystemHealth = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const mockHealthData = {
    overallStatus: 'OPERATIONAL',
    uptime: '99.995%',
    lastIncident: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    averageResponseTime: 120, // ms
    cpuUsage: 35.5, // %
    memoryUsage: 58.2, // %
    diskUsage: 45.0, // %
    networkThroughput: 250.5, // Mbps
    activeConnections: 1500,
    securityScore: 'A+',
    energyEfficiency: '96.5%',
    services: [
      { name: 'Backend API', status: 'OPERATIONAL', icon: <CloudQueueIcon />, details: 'All endpoints responsive' },
      { name: 'Database Service', status: 'OPERATIONAL', icon: <StorageIcon />, details: 'Read/Write normal' },
      { name: 'Blockchain Node (Mainnet)', status: 'OPERATIONAL', icon: <LinkIcon />, details: 'Sync at block #1234567' },
      { name: 'Constituency Nodes (Avg)', status: 'OPERATIONAL', icon: <DnsIcon />, details: 'Avg. latency 30ms' },
      { name: 'Division Nodes (Avg)', status: 'OPERATIONAL', icon: <DnsIcon />, details: 'Avg. latency 45ms' },
      { name: 'National Node', status: 'OPERATIONAL', icon: <DnsIcon />, details: 'Latency 20ms' },
      { name: 'Rollup Service', status: 'OPERATIONAL', icon: <AssessmentIcon />, details: 'Last rollup 5 mins ago' },
      { name: 'Energy Management', status: 'OPERATIONAL', icon: <PowerIcon />, details: 'Optimization active' },
      { name: 'Audit Service', status: 'OPERATIONAL', icon: <VerifiedUserIcon />, details: 'Logging events' },
      { name: 'Web Frontend', status: 'DEGRADED_PERFORMANCE', icon: <DnsIcon />, details: 'High traffic on voting page' },
      { name: 'External Oracle', status: 'PARTIAL_OUTAGE', icon: <LinkIcon />, details: 'Price feed delayed' },
    ],
    recentAlerts: [
      { type: 'warning', message: 'High CPU usage on web-server-3', timestamp: new Date(Date.now() - 300000) },
      { type: 'info', message: 'Database backup completed successfully', timestamp: new Date(Date.now() - 3600000) },
    ]
  };

  useEffect(() => {
    fetchHealthData();
    const interval = setInterval(fetchHealthData, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchHealthData = async () => {
    setLoading(true);
    try {
      // const response = await apiService.getSystemHealth();
      // setHealthData(response.data);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setHealthData(mockHealthData);
      setLastUpdated(new Date());
      // toast.success('System health updated'); // Can be too noisy for auto-refresh
    } catch (error) {
      console.error('Error fetching system health:', error);
      toast.error('Failed to load system health data.');
      // Keep stale data if fetch fails, or clear it
      // setHealthData(null); 
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'OPERATIONAL') return 'success.main';
    if (status === 'DEGRADED_PERFORMANCE') return 'warning.main';
    if (status === 'PARTIAL_OUTAGE' || status === 'MAJOR_OUTAGE') return 'error.main';
    return 'text.secondary';
  };

  const getStatusChip = (status) => {
    let color;
    let icon;
    switch (status) {
      case 'OPERATIONAL':
        color = 'success';
        icon = <CheckCircleIcon />;
        break;
      case 'DEGRADED_PERFORMANCE':
        color = 'warning';
        icon = <WarningIcon />;
        break;
      case 'PARTIAL_OUTAGE':
      case 'MAJOR_OUTAGE':
        color = 'error';
        icon = <ErrorIcon />;
        break;
      default:
        color = 'default';
        icon = <InfoOutlined />;
    }
    return <Chip label={status.replace('_', ' ')} color={color} size="small" icon={icon} sx={{ textTransform: 'capitalize' }} />;
  };

  const MetricCard = ({ title, value, icon, progressValue, progressColor = 'primary', unit = '' }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          {icon}
          <Typography variant="h6" sx={{ ml: 1 }}>{title}</Typography>
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          {value}{unit}
        </Typography>
        {progressValue !== undefined && (
          <LinearProgress variant="determinate" value={progressValue} color={progressColor} sx={{ mt: 1, height: 6, borderRadius: 3 }} />
        )}
      </CardContent>
    </Card>
  );

  if (loading && !healthData) { // Show full page loader only on initial load
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!healthData) {
    return <Alert severity="error">System health data is currently unavailable. Please try refreshing.</Alert>;
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: `linear-gradient(135deg, ${getStatusColor(healthData.overallStatus)} 0%, ${getStatusColor(healthData.overallStatus)}CC 100%)` }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                System Health Overview
              </Typography>
              {getStatusChip(healthData.overallStatus)}
              {lastUpdated && (
                <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                  Last updated: {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                </Typography>
              )}
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Tooltip title="Refresh Data">
                <IconButton onClick={fetchHealthData} disabled={loading} sx={{ color: 'white' }}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Typography variant="h6">Uptime: {healthData.uptime}</Typography>
              <Typography variant="body2">Avg Response: {healthData.averageResponseTime}ms</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard title="CPU Usage" value={healthData.cpuUsage} unit="%" icon={<SpeedIcon color="primary" />} progressValue={healthData.cpuUsage} progressColor={healthData.cpuUsage > 80 ? 'error' : 'primary'} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard title="Memory Usage" value={healthData.memoryUsage} unit="%" icon={<MemoryIcon color="secondary" />} progressValue={healthData.memoryUsage} progressColor={healthData.memoryUsage > 80 ? 'error' : 'secondary'} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard title="Disk Usage" value={healthData.diskUsage} unit="%" icon={<StorageIcon color="success" />} progressValue={healthData.diskUsage} progressColor={healthData.diskUsage > 90 ? 'error' : 'success'} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard title="Network" value={healthData.networkThroughput} unit=" Mbps" icon={<NetworkIcon color="info" />} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Services Status */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Services Status</Typography>
              <List dense>
                {healthData.services.map((service, index) => (
                  <React.Fragment key={service.name}>
                    <ListItem secondaryAction={getStatusChip(service.status)}>
                      <ListItemIcon sx={{ color: getStatusColor(service.status) }}>
                        {React.cloneElement(service.icon, { color: 'inherit' })}
                      </ListItemIcon>
                      <ListItemText 
                        primary={service.name} 
                        secondary={service.details}
                        primaryTypographyProps={{ fontWeight: 500 }}
                      />
                    </ListItem>
                    {index < healthData.services.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* System Info & Alerts */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>System Information</Typography>
              <InfoItem icon={<SecurityIcon />} label="Security Score" value={healthData.securityScore} />
              <InfoItem icon={<PowerIcon />} label="Energy Efficiency" value={healthData.energyEfficiency} />
              <InfoItem icon={<ErrorIcon />} label="Last Incident" value={healthData.lastIncident ? formatDistanceToNow(new Date(healthData.lastIncident), { addSuffix: true }) : 'None'} />
              <InfoItem icon={<DnsIcon />} label="Active Connections" value={healthData.activeConnections.toLocaleString()} />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Recent Alerts</Typography>
              {healthData.recentAlerts.length > 0 ? (
                <List dense>
                  {healthData.recentAlerts.map((alert, index) => (
                    <ListItem key={index} sx={{ alignItems: 'flex-start' }}>
                      <ListItemIcon sx={{ mt: 0.5 }}>
                        {alert.type === 'warning' ? <WarningIcon color="warning" /> : <InfoOutlined color="info" />}
                      </ListItemIcon>
                      <ListItemText 
                        primary={alert.message}
                        secondary={formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">No recent alerts.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

const InfoItem = ({ icon, label, value }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
    <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32, mr: 1.5 }}>
      {React.cloneElement(icon, { sx: { fontSize: 18 }})}
    </Avatar>
    <Box>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{value}</Typography>
    </Box>
  </Box>
);

export default SystemHealth;