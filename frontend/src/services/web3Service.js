import { ethers } from 'ethers';

// Contract ABIs (simplified versions - in production these would be imported from build artifacts)
const VOTING_CONTRACT_ABI = [
  'function vote(uint256 candidateId) external',
  'function getVoteCount(uint256 candidateId) external view returns (uint256)',
  'function hasVoted(address voter) external view returns (bool)',
  'function votingStartTime() external view returns (uint256)',
  'function votingEndTime() external view returns (uint256)',
  'function isVotingActive() external view returns (bool)',
  'function getCandidateCount() external view returns (uint256)',
  'function getCandidate(uint256 candidateId) external view returns (string memory, string memory)',
  'event VoteCast(address indexed voter, uint256 indexed candidateId, uint256 timestamp)'
];

const ROLLUP_BRIDGE_ABI = [
  'function submitBatch(bytes32[] memory voteHashes, uint256 batchId) external',
  'function verifyBatch(uint256 batchId) external view returns (bool)',
  'function getBatchInfo(uint256 batchId) external view returns (uint256, uint256, bool)',
  'event BatchSubmitted(uint256 indexed batchId, uint256 voteCount, address indexed submitter)'
];

const NATIONAL_TALLY_ABI = [
  'function aggregateResults(uint256[] memory divisionResults) external',
  'function getFinalResults() external view returns (uint256[] memory)',
  'function isResultsFinalized() external view returns (bool)',
  'function finalizeElection() external',
  'event ResultsAggregated(uint256 totalVotes, uint256 timestamp)',
  'event ElectionFinalized(uint256 timestamp)'
];

// Network configurations
const NETWORK_CONFIGS = {
  development: {
    chainId: 1337,
    name: 'Ganache Local',
    rpcUrl: 'http://localhost:8545',
    blockExplorer: null
  },
  testnet: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: process.env.REACT_APP_SEPOLIA_RPC_URL,
    blockExplorer: 'https://sepolia.etherscan.io'
  },
  mainnet: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: process.env.REACT_APP_MAINNET_RPC_URL,
    blockExplorer: 'https://etherscan.io'
  }
};

// Contract addresses (would be loaded from environment or config)
const CONTRACT_ADDRESSES = {
  constituency: {
    voting: process.env.REACT_APP_CONSTITUENCY_VOTING_ADDRESS,
    token: process.env.REACT_APP_CONSTITUENCY_TOKEN_ADDRESS
  },
  division: {
    rollupBridge: process.env.REACT_APP_DIVISION_ROLLUP_ADDRESS
  },
  national: {
    tally: process.env.REACT_APP_NATIONAL_TALLY_ADDRESS
  }
};

class Web3Service {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.currentAccount = null;
    this.currentNetwork = null;
    this.isInitialized = false;
  }

  // Initialize Web3 connection
  async initialize() {
    try {
      console.log('🔗 Initializing Web3 service...');
      
      // Check if MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        console.warn('⚠️ MetaMask not detected');
        return false;
      }

      // Create provider
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      
      // Get network info
      const network = await this.provider.getNetwork();
      this.currentNetwork = network;
      
      console.log('🌐 Connected to network:', network.name, `(Chain ID: ${network.chainId})`);
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Initialize contracts
      await this.initializeContracts();
      
      this.isInitialized = true;
      console.log('✅ Web3 service initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Web3:', error);
      return false;
    }
  }

  // Connect wallet
  async connectWallet() {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      this.currentAccount = accounts[0];
      this.signer = this.provider.getSigner();
      
      console.log('👤 Wallet connected:', this.currentAccount);
      
      // Re-initialize contracts with signer
      await this.initializeContracts();
      
      return {
        address: this.currentAccount,
        balance: await this.getBalance(this.currentAccount)
      };
    } catch (error) {
      console.error('❌ Failed to connect wallet:', error);
      throw error;
    }
  }

  // Disconnect wallet
  disconnectWallet() {
    this.currentAccount = null;
    this.signer = null;
    console.log('👋 Wallet disconnected');
  }

  // Get account balance
  async getBalance(address) {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error('❌ Failed to get balance:', error);
      return '0';
    }
  }

  // Initialize smart contracts
  async initializeContracts() {
    try {
      const signerOrProvider = this.signer || this.provider;
      
      // Initialize constituency contracts
      if (CONTRACT_ADDRESSES.constituency.voting) {
        this.contracts.voting = new ethers.Contract(
          CONTRACT_ADDRESSES.constituency.voting,
          VOTING_CONTRACT_ABI,
          signerOrProvider
        );
      }
      
      // Initialize division contracts
      if (CONTRACT_ADDRESSES.division.rollupBridge) {
        this.contracts.rollupBridge = new ethers.Contract(
          CONTRACT_ADDRESSES.division.rollupBridge,
          ROLLUP_BRIDGE_ABI,
          signerOrProvider
        );
      }
      
      // Initialize national contracts
      if (CONTRACT_ADDRESSES.national.tally) {
        this.contracts.nationalTally = new ethers.Contract(
          CONTRACT_ADDRESSES.national.tally,
          NATIONAL_TALLY_ABI,
          signerOrProvider
        );
      }
      
      console.log('📄 Smart contracts initialized');
    } catch (error) {
      console.error('❌ Failed to initialize contracts:', error);
    }
  }

  // Set up event listeners
  setupEventListeners() {
    if (!window.ethereum) return;

    // Account changed
    window.ethereum.on('accountsChanged', (accounts) => {
      console.log('👤 Account changed:', accounts[0]);
      if (accounts.length === 0) {
        this.disconnectWallet();
      } else {
        this.currentAccount = accounts[0];
        this.signer = this.provider.getSigner();
        this.initializeContracts();
      }
      
      // Emit custom event for components to listen
      window.dispatchEvent(new CustomEvent('accountChanged', {
        detail: { account: accounts[0] }
      }));
    });

    // Network changed
    window.ethereum.on('chainChanged', (chainId) => {
      console.log('🌐 Network changed:', chainId);
      window.location.reload(); // Reload to reinitialize with new network
    });

    // Connection status
    window.ethereum.on('connect', (connectInfo) => {
      console.log('🔗 Connected to network:', connectInfo.chainId);
    });

    window.ethereum.on('disconnect', (error) => {
      console.log('🔌 Disconnected from network:', error);
    });
  }

  // Voting functions
  async castVote(candidateId) {
    try {
      if (!this.contracts.voting) {
        throw new Error('Voting contract not initialized');
      }

      if (!this.signer) {
        throw new Error('Wallet not connected');
      }

      console.log('🗳️ Casting vote for candidate:', candidateId);
      
      // Estimate gas
      const gasEstimate = await this.contracts.voting.estimateGas.vote(candidateId);
      
      // Add 20% buffer to gas estimate
      const gasLimit = gasEstimate.mul(120).div(100);
      
      // Submit transaction
      const tx = await this.contracts.voting.vote(candidateId, {
        gasLimit
      });
      
      console.log('📝 Vote transaction submitted:', tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      console.log('✅ Vote confirmed in block:', receipt.blockNumber);
      
      return {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('❌ Failed to cast vote:', error);
      throw error;
    }
  }

  // Check if user has voted
  async hasVoted(address = null) {
    try {
      if (!this.contracts.voting) {
        throw new Error('Voting contract not initialized');
      }

      const voterAddress = address || this.currentAccount;
      if (!voterAddress) {
        throw new Error('No address provided');
      }

      const hasVoted = await this.contracts.voting.hasVoted(voterAddress);
      return hasVoted;
    } catch (error) {
      console.error('❌ Failed to check voting status:', error);
      return false;
    }
  }

  // Get vote count for candidate
  async getVoteCount(candidateId) {
    try {
      if (!this.contracts.voting) {
        throw new Error('Voting contract not initialized');
      }

      const voteCount = await this.contracts.voting.getVoteCount(candidateId);
      return voteCount.toString();
    } catch (error) {
      console.error('❌ Failed to get vote count:', error);
      return '0';
    }
  }

  // Get voting period info
  async getVotingPeriod() {
    try {
      if (!this.contracts.voting) {
        throw new Error('Voting contract not initialized');
      }

      const [startTime, endTime, isActive] = await Promise.all([
        this.contracts.voting.votingStartTime(),
        this.contracts.voting.votingEndTime(),
        this.contracts.voting.isVotingActive()
      ]);

      return {
        startTime: new Date(startTime.toNumber() * 1000),
        endTime: new Date(endTime.toNumber() * 1000),
        isActive
      };
    } catch (error) {
      console.error('❌ Failed to get voting period:', error);
      return null;
    }
  }

  // Get candidates
  async getCandidates() {
    try {
      if (!this.contracts.voting) {
        throw new Error('Voting contract not initialized');
      }

      const candidateCount = await this.contracts.voting.getCandidateCount();
      const candidates = [];

      for (let i = 0; i < candidateCount.toNumber(); i++) {
        const [name, description] = await this.contracts.voting.getCandidate(i);
        const voteCount = await this.getVoteCount(i);
        
        candidates.push({
          id: i,
          name,
          description,
          voteCount
        });
      }

      return candidates;
    } catch (error) {
      console.error('❌ Failed to get candidates:', error);
      return [];
    }
  }

  // Listen to vote events
  listenToVoteEvents(callback) {
    if (!this.contracts.voting) {
      console.warn('⚠️ Voting contract not initialized');
      return;
    }

    const filter = this.contracts.voting.filters.VoteCast();
    
    this.contracts.voting.on(filter, (voter, candidateId, timestamp, event) => {
      console.log('🗳️ Vote event detected:', {
        voter,
        candidateId: candidateId.toString(),
        timestamp: new Date(timestamp.toNumber() * 1000),
        transactionHash: event.transactionHash
      });
      
      if (callback) {
        callback({
          voter,
          candidateId: candidateId.toString(),
          timestamp: new Date(timestamp.toNumber() * 1000),
          transactionHash: event.transactionHash
        });
      }
    });
  }

  // Stop listening to events
  stopListening() {
    if (this.contracts.voting) {
      this.contracts.voting.removeAllListeners();
    }
    if (this.contracts.rollupBridge) {
      this.contracts.rollupBridge.removeAllListeners();
    }
    if (this.contracts.nationalTally) {
      this.contracts.nationalTally.removeAllListeners();
    }
  }

  // Utility functions
  isConnected() {
    return !!this.currentAccount;
  }

  getCurrentAccount() {
    return this.currentAccount;
  }

  getCurrentNetwork() {
    return this.currentNetwork;
  }

  getProvider() {
    return this.provider;
  }

  getSigner() {
    return this.signer;
  }

  // Format address for display
  formatAddress(address, length = 6) {
    if (!address) return '';
    return `${address.slice(0, length)}...${address.slice(-4)}`;
  }

  // Validate Ethereum address
  isValidAddress(address) {
    return ethers.utils.isAddress(address);
  }

  // Convert Wei to Ether
  weiToEther(wei) {
    return ethers.utils.formatEther(wei);
  }

  // Convert Ether to Wei
  etherToWei(ether) {
    return ethers.utils.parseEther(ether.toString());
  }

  // Get transaction receipt
  async getTransactionReceipt(txHash) {
    try {
      return await this.provider.getTransactionReceipt(txHash);
    } catch (error) {
      console.error('❌ Failed to get transaction receipt:', error);
      return null;
    }
  }

  // Get current gas price
  async getGasPrice() {
    try {
      const gasPrice = await this.provider.getGasPrice();
      return ethers.utils.formatUnits(gasPrice, 'gwei');
    } catch (error) {
      console.error('❌ Failed to get gas price:', error);
      return '0';
    }
  }
}

// Create and export singleton instance
export const web3Service = new Web3Service();
export default web3Service;