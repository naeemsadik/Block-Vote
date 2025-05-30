import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Box,
  Badge,
  Menu,
  MenuItem,
  Avatar,
  Chip,
  Tooltip,
  Divider,
  Alert,
  Collapse,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  AccountBalanceWallet as WalletIcon,
  EnergySavingsLeaf as EcoIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';

// Services
import { web3Service } from '../../services/web3Service';

const Navbar = ({ onSidebarToggle, systemStatus, isConnected, userRole }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [showSystemAlert, setShowSystemAlert] = useState(true);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationMenuOpen = (event) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationMenuClose = () => {
    setNotificationAnchor(null);
  };

  const handleConnectWallet = async () => {
    if (!isConnected) {
      toast.warn('Web3 service is not yet initialized. Please wait or try refreshing the page.');
      return;
    }
    try {
      setWalletConnecting(true);
      const walletInfo = await web3Service.connectWallet();
      toast.success(`Wallet connected: ${web3Service.formatAddress(walletInfo.address)}`);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      toast.error('Failed to connect wallet. Please make sure MetaMask is installed and the application has initialized correctly.');
    } finally {
      setWalletConnecting(false);
    }
  };

  const handleDisconnectWallet = () => {
    web3Service.disconnectWallet();
    toast.info('Wallet disconnected');
    handleProfileMenuClose();
  };

  const handleLogout = () => {
    // Clear user session
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    web3Service.disconnectWallet();
    
    toast.info('Logged out successfully');
    handleProfileMenuClose();
    
    // Redirect to login or refresh
    window.location.reload();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
      case 'offline':
        return 'error';
      default:
        return 'info';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return <CheckCircleIcon fontSize="small" />;
      case 'warning':
        return <WarningIcon fontSize="small" />;
      case 'error':
      case 'offline':
        return <ErrorIcon fontSize="small" />;
      default:
        return <CheckCircleIcon fontSize="small" />;
    }
  };

  // Mock notifications
  const notifications = [
    {
      id: 1,
      title: 'New Vote Cast',
      message: 'Vote recorded in Constituency 42',
      time: '2 min ago',
      type: 'success',
      read: false,
    },
    {
      id: 2,
      title: 'Energy Efficiency Update',
      message: 'System efficiency improved by 2.3%',
      time: '15 min ago',
      type: 'info',
      read: false,
    },
    {
      id: 3,
      title: 'Batch Processing Complete',
      message: 'Division 8 batch processed successfully',
      time: '1 hour ago',
      type: 'success',
      read: true,
    },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <AppBar
        position="sticky"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Toolbar>
          {/* Menu Button */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={onSidebarToggle}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>

          {/* Logo and Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <EcoIcon sx={{ mr: 1, fontSize: 28 }} />
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
              BlockVote
            </Typography>
            <Chip
              label="Green Computing"
              size="small"
              sx={{
                ml: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                fontWeight: 500,
              }}
            />
          </Box>

          {/* System Status Indicators */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
            {/* Energy Status */}
            <Tooltip title="Energy Efficiency: 95.2%">
              <Chip
                icon={<EcoIcon />}
                label="95.2%"
                size="small"
                color="success"
                variant="outlined"
                sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.5)' }}
              />
            </Tooltip>

            {/* Performance Status */}
            <Tooltip title="System Performance: Optimal">
              <Chip
                icon={<SpeedIcon />}
                label="1.2s"
                size="small"
                color="info"
                variant="outlined"
                sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.5)' }}
              />
            </Tooltip>

            {/* Security Status */}
            <Tooltip title="Security: Active">
              <Chip
                icon={<SecurityIcon />}
                label="Secure"
                size="small"
                color="success"
                variant="outlined"
                sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.5)' }}
              />
            </Tooltip>
          </Box>

          {/* Wallet Connection */}
          {!isConnected ? (
            <Button
              color="inherit"
              startIcon={<WalletIcon />}
              onClick={handleConnectWallet}
              disabled={walletConnecting}
              sx={{
                mr: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                },
              }}
            >
              {walletConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          ) : (
            <Tooltip title={`Connected: ${web3Service.formatAddress(web3Service.getCurrentAccount())}`}>
              <Chip
                icon={<WalletIcon />}
                label="Connected"
                color="success"
                size="small"
                sx={{ mr: 2, color: 'white' }}
              />
            </Tooltip>
          )}

          {/* Notifications */}
          <IconButton
            color="inherit"
            onClick={handleNotificationMenuOpen}
            sx={{ mr: 1 }}
          >
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          {/* Profile Menu */}
          <IconButton
            color="inherit"
            onClick={handleProfileMenuOpen}
            sx={{ ml: 1 }}
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(255, 255, 255, 0.2)' }}>
              <AccountCircle />
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* System Status Alert */}
      {systemStatus && systemStatus.status !== 'healthy' && showSystemAlert && (
        <Collapse in={showSystemAlert}>
          <Alert
            severity={getStatusColor(systemStatus.status)}
            icon={getStatusIcon(systemStatus.status)}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => setShowSystemAlert(false)}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
            sx={{ borderRadius: 0 }}
          >
            <strong>System Status:</strong> {systemStatus.message}
          </Alert>
        </Collapse>
      )}

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        onClick={handleProfileMenuClose}
        PaperProps={
          {
            elevation: 0,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
              mt: 1.5,
              minWidth: 200,
              '& .MuiAvatar-root': {
                width: 32,
                height: 32,
                ml: -0.5,
                mr: 1,
              },
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }
        }
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <AccountCircle />
          </Avatar>
          <Box>
            <Typography variant="subtitle2">
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isConnected ? web3Service.formatAddress(web3Service.getCurrentAccount()) : 'Not connected'}
            </Typography>
          </Box>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => window.location.href = '/profile'}>
          <AccountCircle sx={{ mr: 2 }} />
          Profile
        </MenuItem>
        <MenuItem onClick={() => window.location.href = '/settings'}>
          <SettingsIcon sx={{ mr: 2 }} />
          Settings
        </MenuItem>
        {isConnected && (
          <MenuItem onClick={handleDisconnectWallet}>
            <WalletIcon sx={{ mr: 2 }} />
            Disconnect Wallet
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={handleLogout}>
          <LogoutIcon sx={{ mr: 2 }} />
          Logout
        </MenuItem>
      </Menu>

      {/* Notifications Menu */}
      <Menu
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={handleNotificationMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            minWidth: 320,
            maxHeight: 400,
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Notifications</Typography>
          {unreadCount > 0 && (
            <Typography variant="body2" color="text.secondary">
              {unreadCount} unread
            </Typography>
          )}
        </Box>
        {notifications.map((notification, index) => (
          <MenuItem
            key={notification.id}
            onClick={handleNotificationMenuClose}
            sx={{
              borderLeft: notification.read ? 'none' : '4px solid',
              borderColor: notification.type === 'success' ? 'success.main' : 'info.main',
              opacity: notification.read ? 0.7 : 1,
            }}
          >
            <Box sx={{ width: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: notification.read ? 400 : 600 }}>
                {notification.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {notification.message}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {notification.time}
              </Typography>
            </Box>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={() => window.location.href = '/notifications'}>
          <Typography variant="body2" color="primary" sx={{ textAlign: 'center', width: '100%' }}>
            View All Notifications
          </Typography>
        </MenuItem>
      </Menu>
    </>
  );
};

export default Navbar;