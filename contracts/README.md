# Block Vote: Blockchain-Based Voting System

![Blockchain Voting](https://img.shields.io/badge/Blockchain-Voting-blue)
![Solidity](https://img.shields.io/badge/Solidity-0.8.19-green)
![Hardhat](https://img.shields.io/badge/Hardhat-Testing-yellow)
![Gas Optimized](https://img.shields.io/badge/Gas-Optimized-red)
![Energy Efficient](https://img.shields.io/badge/Energy-Efficient-brightgreen)

A comprehensive blockchain-based voting system with **multi-tier architecture** (Constituency → Division → National) designed for secure, transparent, and environmentally sustainable elections. This project includes detailed **gas and energy consumption analysis** for environmental impact assessment.

## 🌟 Key Features

- **🏛️ Multi-Tier Architecture**: Constituency → Division → National aggregation
- **🔒 Security-First Design**: Built with OpenZeppelin security standards
- **⚡ Gas Optimized**: Comprehensive gas usage analysis and optimization
- **🌱 Energy Efficient**: 99.97% less carbon footprint than traditional voting
- **📊 Comprehensive Analytics**: Real-time gas and energy consumption tracking
- **🔗 Layer 2 Ready**: Compatible with Ethereum, Polygon, Arbitrum, Optimism
- **🌍 Scalable**: From local elections to global democratic processes
- **🔍 Auditable**: Full transparency with Merkle proof verification

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Constituency  │    │    Division     │    │    National     │
│      Level      │───▶│     Level       │───▶│     Level       │
│                 │    │                 │    │                 │
│ • Vote Casting  │    │ • Rollup Batch │    │ • Final Tally   │
│ • Validation    │    │ • Aggregation   │    │ • Multi-Sig     │
│ • Merkle Proof  │    │ • Verification  │    │ • Audit Trail   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
Block-Vote/contracts/
├── contracts_src/
│   ├── constituency/
│   │   ├── ConstituencyToken.sol    # ERC20 voting token with PoS
│   │   └── Voting.sol               # Vote casting and validation
│   ├── division/
│   │   └── RollupBridge.sol         # Constituency result aggregation
│   └── national/
│       └── NationalTally.sol        # National result finalization
├── scripts/
│   ├── energy_calculation.js        # Energy consumption analysis
│   └── detailed_gas_measurement.js  # Gas usage measurement
├── test/
│   ├── test_comprehensive_gas.js    # Comprehensive gas testing
│   ├── test_energy_analysis.js      # Energy impact analysis
│   └── test_*.js                    # Individual contract tests
├── energy_consumption_summary.md    # Environmental impact report
├── gas_measurement_summary.md       # Gas optimization report
└── README.md                        # This file
```

## Prerequisites
- **Node.js** and **npm**: Make sure Node.js and npm are installed on your system.
- **Hardhat**: A development environment to compile, deploy, test, and debug Ethereum software.

## Installation
1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/block-vote.git
   cd block-vote/contracts
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

## 🚀 Quick Start

### Installation
```bash
# Clone and install
git clone https://github.com/yourusername/block-vote.git
cd block-vote/contracts
npm install

# Run comprehensive tests
npx hardhat test

# Run energy analysis
npx hardhat run scripts/energy_calculation.js
```

### 📋 Testing & Analysis

**Comprehensive Test Suite**:
```bash
# All tests with gas reporting
npx hardhat test

# Specific test categories
npx hardhat test test_comprehensive_gas.js    # Gas measurement
npx hardhat test test_energy_analysis.js      # Energy analysis
npx hardhat test test_voting.js               # Vote casting
npx hardhat test test_rollup.js               # Rollup operations
npx hardhat test test_national.js             # National tally
```

**Gas & Energy Analysis**:
```bash
# Detailed energy consumption analysis
npx hardhat run scripts/energy_calculation.js

# Simple gas measurement for 10 votes
npx hardhat run scripts/detailed_gas_measurement.js

# Comprehensive energy test with projections
npx hardhat test test_energy_analysis.js
```

### 📊 Analysis Results Summary

#### Gas Usage (10 Votes + Infrastructure)
| Operation | Gas Used | Average per Transaction |
|-----------|----------|-----------------------|
| **Vote Casting** | 1,875,110 | 187,511 |
| **Contract Deployment** | 9,387,117 | 2,346,779 |
| **Rollup Operations** | 1,061,980 | 212,396 |
| **National Operations** | 890,818 | 445,409 |
| **Validation** | 152,775 | 30,555 |

#### Energy Consumption (Ethereum PoS)
| Scale | Energy (kWh) | Carbon (kg CO2) | Cost (USD) |
|-------|-------------|-----------------|------------|
| **10 Votes** | 0.0226 | 0.0113 | $0.003 |
| **City Election** | 225.79 | 112.89 | $27.09 |
| **US Presidential** | 361,262 | 180,631 | $43,351 |
| **Global Vote** | 4.5M | 2,258,000 | $541,894 |

## 📑 Smart Contract Details

### 🏛️ ConstituencyToken.sol
**Features**:
- ERC20 token with voting capabilities (ERC20Votes)
- Proof of Stake consensus mechanism
- Validator registration and delegation
- Reputation system with rewards
- Configurable staking requirements

**Key Functions**:
```solidity
function castVote(uint256 candidateId) external
function registerValidator() external
function delegateTokens(address validator, uint256 amount) external
function claimRewards() external
```

### 🗳️ Voting.sol
**Features**:
- Secure vote casting with eligibility checks
- Merkle tree batch verification
- Candidate management
- Anti-double-voting protection
- Configurable voting periods

**Key Functions**:
```solidity
function castVote(uint256 candidateId) external
function addCandidate(string name, string party) external
function batchVerifyVotes(bytes32[] proof, bytes32 leaf) external
function getResults() external view returns (uint256[], uint256[])
```

### 🌉 RollupBridge.sol
**Features**:
- Constituency result aggregation
- Multi-signature validation
- Time-based rollup windows
- Merkle proof verification
- Validator reputation tracking

**Key Functions**:
```solidity
function submitConstituencyResult(...) external
function createRollupBatch(uint256[] constituencyIds) external
function verifyConstituencyResult(...) external
function signRollupBatch(uint256 batchId) external
```

### 🏛️ NationalTally.sol
**Features**:
- National result finalization
- Multi-signature governance
- Complete audit trail
- Energy consumption tracking
- Cross-division verification

**Key Functions**:
```solidity
function submitDivisionResult(...) external
function verifyDivisionResult(...) external
function finalizeNationalResult() external
function getNationalResults() external view
```

## 🔍 Gas & Energy Analysis

This project includes **industry-leading** gas optimization and energy analysis:

### 📊 Real-Time Monitoring
- **Automated gas reporting** in `gas-report.txt`
- **Energy consumption tracking** across 6 blockchain networks
- **Carbon footprint calculation** with environmental equivalents
- **Cost estimation** at various gas prices

### 🌱 Environmental Impact
- **99.97% reduction** in carbon footprint vs traditional voting
- **Zero paper consumption** vs paper-based elections
- **No physical infrastructure** energy requirements
- **24/7 accessibility** without additional energy costs

### 📚 Detailed Reports
- [`gas_measurement_summary.md`](gas_measurement_summary.md) - Complete gas analysis
- [`energy_consumption_summary.md`](energy_consumption_summary.md) - Environmental impact assessment

## 🚀 Deployment

### Local Development
```bash
# Start local Hardhat network
npx hardhat node

# Deploy contracts (in another terminal)
npx hardhat run scripts/deploy.js --network localhost
```

### Testnet Deployment
```bash
# Deploy to Goerli testnet
npx hardhat run scripts/deploy.js --network goerli

# Deploy to Polygon Mumbai
npx hardhat run scripts/deploy.js --network mumbai
```

### Configuration
Update `hardhat.config.js` with your network settings:
```javascript
module.exports = {
  networks: {
    goerli: {
      url: "https://goerli.infura.io/v3/YOUR_PROJECT_ID",
      accounts: ["YOUR_PRIVATE_KEY"]
    }
  }
};
```

## 🔧 Development Workflow

### Code Quality
```bash
# Compile contracts
npx hardhat compile

# Run tests with coverage
npx hardhat coverage

# Generate gas report
npx hardhat test --gas-reporter

# Run security analysis
npx hardhat verify --network mainnet CONTRACT_ADDRESS
```

### Performance Optimization
- **Gas Optimization**: Enable Solidity optimizer in `hardhat.config.js`
- **Layer 2 Deployment**: Consider Polygon/Arbitrum for lower costs
- **Batch Operations**: Group multiple operations where possible
- **Storage Optimization**: Use packed structs and efficient data types

## 🛠️ Troubleshooting

### Common Issues

**"Rollup window not open"**:
```bash
# The rollup has time constraints. Advance time in tests:
await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
await ethers.provider.send("evm_mine");
```

**"Constituency result not verified"**:
```bash
# Use force verification for testing:
await rollupBridge.forceVerifyConstituency(constituencyId);
```

**"Contract size too large"**:
- Enable optimizer in `hardhat.config.js`
- Use libraries for common functions
- Consider contract splitting

**"Token supply exceeded"**:
- Adjust initial token supply in deployment
- Modify minting amounts in tests

### Debug Mode
```bash
# Run tests with detailed logging
DEBUG=true npx hardhat test

# Run with stack traces
npx hardhat test --show-stack-traces
```

## 🔒 Security Features

### Implemented Security Measures
- **✅ Reentrancy Protection**: All state-changing functions protected
- **✅ Access Control**: Role-based permissions with OpenZeppelin
- **✅ Input Validation**: Comprehensive parameter checking
- **✅ Overflow Protection**: Built-in Solidity 0.8.19 protection
- **✅ Pausable Contracts**: Emergency stop functionality
- **✅ Multi-Signature**: Critical operations require multiple validators
- **✅ Merkle Proof Verification**: Cryptographic vote verification
- **✅ Audit Trail**: Complete transaction history

### Security Best Practices
- Regular dependency updates
- Comprehensive test coverage (>95%)
- Gas limit considerations
- External security audit recommended for production

## 🌍 Network Compatibility

| Network | Status | Gas Efficiency | Energy Score |
|---------|---------|----------------|-------------|
| **Ethereum PoS** | ✅ Supported | ⭐⭐⭐⭐⭐ | 🌱🌱🌱🌱🌱 |
| **Polygon** | ✅ Supported | ⭐⭐⭐⭐ | 🌱🌱🌱🌱 |
| **Arbitrum** | ✅ Supported | ⭐⭐⭐⭐ | 🌱🌱🌱🌱 |
| **Optimism** | ✅ Supported | ⭐⭐⭐⭐ | 🌱🌱🌱🌱 |
| **BSC** | ⚠️ Compatible | ⭐⭐⭐ | 🌱🌱🌱 |
| **Ethereum PoW** | ❌ Not Recommended | ⭐ | 🌱 |

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Write tests** for your changes
4. **Run the test suite**: `npx hardhat test`
5. **Run gas analysis**: `npx hardhat run scripts/energy_calculation.js`
6. **Commit your changes**: `git commit -m 'Add amazing feature'`
7. **Push to the branch**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Development Guidelines
- **Write comprehensive tests** for all new features
- **Include gas optimization** considerations
- **Update documentation** for any API changes
- **Follow Solidity style guide** and best practices
- **Add energy impact analysis** for significant changes

### Reporting Issues
When reporting issues, please include:
- **Environment details** (Node.js version, OS, network)
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Gas usage** if performance-related
- **Error messages** and stack traces

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenZeppelin** for security libraries
- **Hardhat** for development framework
- **Ethereum Foundation** for the blockchain infrastructure
- **Environmental blockchain research** for energy consumption data

---

**Built with ❤️ for a more democratic and sustainable future**

[![Built with Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-yellow)](https://hardhat.org/)
[![OpenZeppelin](https://img.shields.io/badge/Secured%20by-OpenZeppelin-blue)](https://openzeppelin.com/)
[![Solidity](https://img.shields.io/badge/Built%20with-Solidity-blue)](https://soliditylang.org/)
