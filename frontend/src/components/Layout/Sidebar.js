import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
  Chip,
  Avatar,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  HowToVote as VoteIcon,
  Assessment as ResultsIcon,
  EnergySavingsLeaf as EcoIcon,
  Security as SecurityIcon,
  PersonAdd as RegisterIcon,
  People as CandidatesIcon,
  MonitorHeart as MonitoringIcon,
  AdminPanelSettings as AdminIcon,
  ExpandLess,
  ExpandMore,
  Timeline as TimelineIcon,
  BarChart as AnalyticsIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  Info as InfoIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';

const DRAWER_WIDTH = 280;

const Sidebar = ({ open, onClose, userRole, onRoleChange }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = React.useState({
    voting: true,
    monitoring: false,
    admin: false,
  });

  const handleSectionToggle = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleNavigation = (path) => {
    navigate(path);
    onClose();
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Navigation items based on user role
  const getNavigationItems = () => {
    const baseItems = [
      {
        section: 'main',
        items: [
          {
            text: 'Dashboard',
            icon: <DashboardIcon />,
            path: '/dashboard',
            description: 'System overview and statistics'
          },
        ]
      },
      {
        section: 'voting',
        title: 'Voting System',
        expandable: true,
        items: [
          {
            text: 'Cast Vote',
            icon: <VoteIcon />,
            path: '/vote',
            description: 'Submit your vote securely'
          },
          {
            text: 'Results',
            icon: <ResultsIcon />,
            path: '/results',
            description: 'View election results'
          },
          {
            text: 'Register Voter',
            icon: <RegisterIcon />,
            path: '/register',
            description: 'Register new voters'
          },
        ]
      },
      {
        section: 'monitoring',
        title: 'Monitoring & Analytics',
        expandable: true,
        items: [
          {
            text: 'Energy Dashboard',
            icon: <EcoIcon />,
            path: '/energy',
            description: 'Green computing metrics',
            badge: '95% Efficient'
          },
          {
            text: 'Audit Trail',
            icon: <SecurityIcon />,
            path: '/audit',
            description: 'Security and transparency logs'
          },
          {
            text: 'Analytics',
            icon: <AnalyticsIcon />,
            path: '/analytics',
            description: 'Detailed system analytics'
          },
        ]
      }
    ];

    // Add admin-specific items
    if (userRole === 'admin') {
      baseItems.push({
        section: 'admin',
        title: 'Administration',
        expandable: true,
        items: [
          {
            text: 'Admin Panel',
            icon: <AdminIcon />,
            path: '/admin',
            description: 'System administration'
          },
          {
            text: 'Candidate Management',
            icon: <CandidatesIcon />,
            path: '/candidates',
            description: 'Manage election candidates'
          },
          {
            text: 'System Monitoring',
            icon: <MonitoringIcon />,
            path: '/monitoring',
            description: 'Real-time system monitoring'
          },
        ]
      });
    }

    // Add validator-specific items
    if (userRole === 'validator' || userRole === 'admin') {
      const monitoringSection = baseItems.find(section => section.section === 'monitoring');
      if (monitoringSection && !monitoringSection.items.find(item => item.path === '/monitoring')) {
        monitoringSection.items.push({
          text: 'System Monitoring',
          icon: <MonitoringIcon />,
          path: '/monitoring',
          description: 'Real-time system monitoring'
        });
      }
    }

    return baseItems;
  };

  const navigationItems = getNavigationItems();

  const renderListItem = (item) => (
    <ListItem key={item.path} disablePadding>
      <ListItemButton
        onClick={() => handleNavigation(item.path)}
        selected={isActive(item.path)}
        sx={{
          borderRadius: 1,
          mx: 1,
          mb: 0.5,
          '&.Mui-selected': {
            backgroundColor: 'primary.main',
            color: 'white',
            '&:hover': {
              backgroundColor: 'primary.dark',
            },
            '& .MuiListItemIcon-root': {
              color: 'white',
            },
          },
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 40,
            color: isActive(item.path) ? 'white' : 'text.secondary',
          }}
        >
          {item.icon}
        </ListItemIcon>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ fontWeight: isActive(item.path) ? 600 : 400 }}>
                {item.text}
              </Typography>
              {item.badge && (
                <Chip
                  label={item.badge}
                  size="small"
                  color="success"
                  sx={{ 
                    height: 20, 
                    fontSize: '0.7rem',
                    backgroundColor: isActive(item.path) ? 'rgba(255,255,255,0.2)' : undefined
                  }}
                />
              )}
            </Box>
          }
          secondary={
            <Typography 
              variant="caption" 
              sx={{ 
                color: isActive(item.path) ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                fontSize: '0.7rem'
              }}
            >
              {item.description}
            </Typography>
          }
        />
      </ListItemButton>
    </ListItem>
  );

  const renderSection = (section) => {
    if (section.section === 'main') {
      return (
        <React.Fragment key={section.section}>
          {section.items.map(renderListItem)}
          <Divider sx={{ my: 1 }} />
        </React.Fragment>
      );
    }

    if (section.expandable) {
      const isExpanded = expandedSections[section.section];
      return (
        <React.Fragment key={section.section}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handleSectionToggle(section.section)}
              sx={{
                borderRadius: 1,
                mx: 1,
                mb: 0.5,
                backgroundColor: 'action.hover',
              }}
            >
              <ListItemText
                primary={
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {section.title}
                  </Typography>
                }
              />
              {isExpanded ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 1 }}>
              {section.items.map(renderListItem)}
            </List>
          </Collapse>
          <Divider sx={{ my: 1 }} />
        </React.Fragment>
      );
    }

    return (
      <React.Fragment key={section.section}>
        {section.items.map(renderListItem)}
        <Divider sx={{ my: 1 }} />
      </React.Fragment>
    );
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 1 }}>
              <EcoIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                BlockVote
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Green Computing
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        
        {/* User Role Selector */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {['voter', 'validator', 'admin'].map((role) => (
            <Chip
              key={role}
              label={role.charAt(0).toUpperCase() + role.slice(1)}
              size="small"
              color={userRole === role ? 'primary' : 'default'}
              variant={userRole === role ? 'filled' : 'outlined'}
              onClick={() => onRoleChange(role)}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>
      </Box>

      {/* Navigation */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <List sx={{ pt: 1 }}>
          {navigationItems.map(renderSection)}
        </List>
      </Box>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <List>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handleNavigation('/settings')}
              sx={{ borderRadius: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handleNavigation('/help')}
              sx={{ borderRadius: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <HelpIcon />
              </ListItemIcon>
              <ListItemText primary="Help & Support" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handleNavigation('/about')}
              sx={{ borderRadius: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <InfoIcon />
              </ListItemIcon>
              <ListItemText primary="About" />
            </ListItemButton>
          </ListItem>
        </List>
        
        {/* Version Info */}
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            BlockVote v1.0.0
          </Typography>
          <br />
          <Chip
            label="🌱 Carbon Neutral"
            size="small"
            color="success"
            variant="outlined"
            sx={{ mt: 0.5, fontSize: '0.7rem' }}
          />
        </Box>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            backgroundImage: 'none',
          },
        }}
      >
        {drawerContent}
      </Drawer>
      
      {/* Desktop Drawer */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            backgroundImage: 'none',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default Sidebar;