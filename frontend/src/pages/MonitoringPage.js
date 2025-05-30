import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  AppBar,
} from '@mui/material';
import {
  ShowChart as ShowChartIcon, // For Energy Monitor
  ReceiptLong as ReceiptLongIcon, // For Audit Log
  VerifiedUser as VerifiedUserIcon, // For System Health (or a more generic health icon)
  SettingsApplications as SettingsApplicationsIcon, // Alternative for System Health
  BarChart as BarChartIcon, // Alternative for Energy
  ListAlt as ListAltIcon, // Alternative for Audit
} from '@mui/icons-material';

import EnergyMonitor from '../components/Monitoring/EnergyMonitor';
import AuditLog from '../components/Monitoring/AuditLog';
import SystemHealth from '../components/Monitoring/SystemHealth';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`monitoring-tabpanel-${index}`}
      aria-labelledby={`monitoring-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `monitoring-tab-${index}`,
    'aria-controls': `monitoring-tabpanel-${index}`,
  };
}

const MonitoringPage = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleChangeTab = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', mb: 3 }}>
        System Monitoring Dashboard
      </Typography>
      
      <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <AppBar position="static" color="default" elevation={0}>
          <Tabs
            value={currentTab}
            onChange={handleChangeTab}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
            aria-label="Monitoring Dashboard Tabs"
            sx={{
              '& .MuiTab-root': {
                minHeight: 64, // Increase tab height
                fontWeight: 500,
              },
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Tab 
              icon={<ShowChartIcon />} 
              iconPosition="start" 
              label="Energy Monitor" 
              {...a11yProps(0)} 
            />
            <Tab 
              icon={<ReceiptLongIcon />} 
              iconPosition="start" 
              label="Audit Logs" 
              {...a11yProps(1)} 
            />
            <Tab 
              icon={<SettingsApplicationsIcon />} 
              iconPosition="start" 
              label="System Health" 
              {...a11yProps(2)} 
            />
          </Tabs>
        </AppBar>
        
        <TabPanel value={currentTab} index={0}>
          <EnergyMonitor />
        </TabPanel>
        <TabPanel value={currentTab} index={1}>
          <AuditLog />
        </TabPanel>
        <TabPanel value={currentTab} index={2}>
          <SystemHealth />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default MonitoringPage;