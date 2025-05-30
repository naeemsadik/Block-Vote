import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Chip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Web3Connection from './Web3Connection';

const Navbar = ({ onSidebarToggle, systemStatus, userRole }) => {
  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onSidebarToggle}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          BlockVote
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label={systemStatus}
            color={systemStatus === 'Active' ? 'success' : 'error'}
            size="small"
          />
          <Chip
            label={userRole}
            color="primary"
            size="small"
          />
          <Web3Connection />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 