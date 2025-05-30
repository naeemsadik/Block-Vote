const HDWalletProvider = require('@truffle/hdwallet-provider');
require('dotenv').config();

module.exports = {
  networks: {
    // Development network (Ganache)
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*",
      gas: 6000000,
      gasPrice: 20000000000, // 20 gwei
    },

    // Constituency tier - Public testnet (Sepolia)
    constituency: {
      provider: () => new HDWalletProvider(
        process.env.DEPLOYER_PRIVATE_KEY,
        `${process.env.CONSTITUENCY_NETWORK_URL}${process.env.INFURA_PROJECT_ID}`
      ),
      network_id: 11155111, // Sepolia testnet
      gas: 4000000,
      gasPrice: 20000000000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    },

    // Division tier - Private network
    division: {
      host: "127.0.0.1",
      port: 8545,
      network_id: 1337,
      gas: 6000000,
      gasPrice: 0, // No gas fees for private network
    },

    // National tier - Private network
    national: {
      host: "127.0.0.1",
      port: 8546,
      network_id: 1338,
      gas: 6000000,
      gasPrice: 0, // No gas fees for private network
    },

    // Mainnet configuration (for production)
    mainnet: {
      provider: () => new HDWalletProvider(
        process.env.DEPLOYER_PRIVATE_KEY,
        `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
      ),
      network_id: 1,
      gas: 4000000,
      gasPrice: 20000000000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    }
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.19",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: "london"
      }
    }
  },

  // Truffle DB is currently disabled by default
  db: {
    enabled: false
  },

  // Mocha testing framework configuration
  mocha: {
    timeout: 100000
  },

  // Plugin configuration
  plugins: [
    'truffle-plugin-verify'
  ],

  // API keys for contract verification
  api_keys: {
    etherscan: process.env.ETHERSCAN_API_KEY
  }
};