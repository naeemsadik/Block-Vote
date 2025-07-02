require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: "./contracts_src",
    tests: "./",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  exclude: ["node_modules", "test", "cache", "artifacts", "migrations"],
  networks: {
    hardhat: {}
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    gasPrice: 21,
    outputFile: "gas-report.txt",
    noColors: true,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY || null,
    token: "ETH",
    showMethodSig: true,
    showTimeSpent: true
  }
};
