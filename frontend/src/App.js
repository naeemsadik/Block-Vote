import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, CircularProgress, Typography } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Web3ReactProvider } from '@web3-react/core';

// Components
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import Footer from './components/Layout/Footer';

// Pages
import Dashboard from './pages/Dashboard';
import VotingPage from './pages/VotingPage';
import ResultsPage from './pages/ResultsPage';
import EnergyDashboard from './pages/EnergyDashboard';
import AuditTrail from './pages/AuditTrail';
import AdminPanel from './pages/AdminPanel';
import VoterRegistration from './pages/VoterRegistration';
import CandidateManagement from './pages/CandidateManagement';
import MonitoringPage from './pages/MonitoringPage';

// Services
import { apiService } from './services/apiService';
import { web3Service } from './services/web3Service';

// Web3 configuration
import { getLibrary } from './config/web3';

// Create custom theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#4caf50', // Green for eco-friendly theme
      light: '#81c784',
      dark: '#388e3c',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#2196f3', // Blue for blockchain theme
      light: '#64b5f6',
      dark: '#1976d2',
      contrastText: '#ffffff',
    },
    success: {
      main: '#4caf50',
    },
    warning: {
      main: '#ff9800',
    },
    error: {
      main: '#f44336',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      color: '#333333',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
      color: '#333333',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
      color: '#333333',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      color: '#333333',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      color: '#333333',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      color: '#333333',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '8px 24px',
          fontSize: '1rem',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          transition: 'box-shadow 0.3s ease-in-out',
          '&:hover': {
            boxShadow: '0 8px 15px rgba(0, 0, 0, 0.15)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

function App() {
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);
  const [userRole, setUserRole] = useState('voter'); // voter, admin, validator
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);
      
      // Check system health
      const healthStatus = await apiService.getSystemHealth();
      setSystemStatus(healthStatus);
      
      // Initialize Web3 connection
      const web3Connected = await web3Service.initialize();
      setIsConnected(web3Connected);
      
      // Check user role (this would typically come from authentication)
      const role = localStorage.getItem('userRole') || 'voter';
      setUserRole(role);
      
      console.log('🚀 BlockVote App initialized successfully');
      console.log('📊 System Status:', healthStatus?.status);
      console.log('🔗 Web3 Connected:', web3Connected);
      console.log('👤 User Role:', role);
      
    } catch (error) {
      console.error('❌ Failed to initialize app:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleRoleChange = (newRole) => {
    setUserRole(newRole);
    localStorage.setItem('userRole', newRole);
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          <Box textAlign="center">
            <CircularProgress size={60} sx={{ color: 'white', mb: 2 }} />
            <Typography variant="h5" sx={{ color: 'white', mb: 1 }}>
              Loading BlockVote
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)' }}>
              Initializing green computing voting system...
            </Typography>
          </Box>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Web3ReactProvider getLibrary={getLibrary}>
        <Router>
          <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <Sidebar
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              userRole={userRole}
              onRoleChange={handleRoleChange}
            />
            
            {/* Main Content */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Navigation Bar */}
              <Navbar
                onSidebarToggle={handleSidebarToggle}
                systemStatus={systemStatus}
                isConnected={isConnected}
                userRole={userRole}
              />
              
              {/* Page Content */}
              <Box
                component="main"
                sx={{
                  flexGrow: 1,
                  p: 3,
                  backgroundColor: 'background.default',
                  minHeight: 'calc(100vh - 64px)', // Subtract navbar height
                }}
              >
                <Routes>
                  {/* Voter Routes */}
                  {userRole === 'voter' && (
                    <>
                      <Route path="/vote" element={<VotingPage />} />
                      <Route path="/results" element={<ResultsPage />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/monitoring" element={<MonitoringPage />} />
                    </>
                  )}

                  {/* Admin Routes */}
                  {userRole === 'admin' && (
                    <>
                      <Route path="/admin" element={<AdminPanel />} />
                      <Route path="/register-voter" element={<VoterRegistration />} />
                      <Route path="/manage-candidates" element={<CandidateManagement />} />
                      <Route path="/audit-trail" element={<AuditTrail />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/monitoring" element={<MonitoringPage />} />
                    </>
                  )}

                  {/* Validator Routes */}
                  {userRole === 'validator' && (
                    <>
                      <Route path="/energy-dashboard" element={<EnergyDashboard />} />
                      <Route path="/audit-trail" element={<AuditTrail />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/monitoring" element={<MonitoringPage />} />
                    </>
                  )}

                  {/* Common Routes */}
                  <Route path="/" element={<Navigate to="/dashboard" />} />
                  <Route path="*" element={<Navigate to="/dashboard" />} /> {/* Fallback */}
                </Routes>
              </Box>
              
              {/* Footer */}
              <Footer />
            </Box>
          </Box>
          
          {/* Toast Notifications */}
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </Router>
      </Web3ReactProvider>
      Compiled with problems:
×
ERROR in ./src/pages/EnergyDashboard.js 12:0-74
Module not found: Error: Can't resolve '../contracts/EnergyConsumptionABI.json' in 'D:\Green Computing - BlockVote\frontend\src\pages'    </ThemeProvider>
  );
}

export default App;