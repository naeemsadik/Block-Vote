require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.19",
  paths: {
    sources: "./constituency", // only include actual contract directories
    tests: "./",   // include all test files in the root
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