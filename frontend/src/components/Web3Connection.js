import React, { useState } from 'react';
import { useWeb3React } from '@web3-react/core';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
} from '@mui/icons-material';
import { injected, walletconnect } from '../App';

const Web3Connection = () => {
  const { activate, deactivate, active, account, library } = useWeb3React();
  const [anchorEl, setAnchorEl] = useState(null);
  const [connecting, setConnecting] = useState(false);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const connectWallet = async (connector) => {
    try {
      setConnecting(true);
      await activate(connector);
      handleClose();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setConnecting(false);
    }
  };

  const disconnectWallet = () => {
    deactivate();
    handleClose();
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Box>
      {connecting ? (
        <Button
          variant="contained"
          color="primary"
          startIcon={<CircularProgress size={20} color="inherit" />}
          disabled
        >
          Connecting...
        </Button>
      ) : active ? (
        <Button
          variant="contained"
          color="primary"
          startIcon={<WalletIcon />}
          onClick={handleClick}
        >
          {formatAddress(account)}
        </Button>
      ) : (
        <Button
          variant="contained"
          color="primary"
          startIcon={<WalletIcon />}
          onClick={handleClick}
        >
          Connect Wallet
        </Button>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          elevation: 3,
          sx: {
            mt: 1,
            minWidth: 200,
          },
        }}
      >
        {active ? (
          <MenuItem onClick={disconnectWallet}>
            <ListItemIcon>
              <LinkOffIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Disconnect</ListItemText>
          </MenuItem>
        ) : (
          <>
            <MenuItem onClick={() => connectWallet(injected)}>
              <ListItemIcon>
                <WalletIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>MetaMask</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => connectWallet(walletconnect)}>
              <ListItemIcon>
                <LinkIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>WalletConnect</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
};

export default Web3Connection; 