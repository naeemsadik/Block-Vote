import { InjectedConnector } from '@web3-react/injected-connector';
import { WalletConnectConnector } from '@web3-react/walletconnect-connector';
import { ethers } from 'ethers';

// Supported chain IDs
const supportedChainIds = [1, 3, 4, 5, 42, 1337]; // Add your network IDs here

// Injected connector (MetaMask)
export const injected = new InjectedConnector({
  supportedChainIds,
});

// WalletConnect connector
export const walletconnect = new WalletConnectConnector({
  rpc: {
    1: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
    3: 'https://ropsten.infura.io/v3/YOUR_INFURA_KEY',
    4: 'https://rinkeby.infura.io/v3/YOUR_INFURA_KEY',
    5: 'https://goerli.infura.io/v3/YOUR_INFURA_KEY',
    42: 'https://kovan.infura.io/v3/YOUR_INFURA_KEY',
    1337: 'http://localhost:8545',
  },
  bridge: 'https://bridge.walletconnect.org',
  qrcode: true,
  pollingInterval: 15000,
});

// Get library function for Web3ReactProvider
export const getLibrary = (provider) => {
  return new ethers.providers.Web3Provider(provider);
}; 