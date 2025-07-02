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

## Usage

### Running Tests

Run the comprehensive test suite:
```bash
npx hardhat test
```

### Gas and Energy Analysis

**Run Energy Analysis Script**:
```bash
npx hardhat run scripts/energy_calculation.js
```

**Run Comprehensive Energy Test**:
```bash
npx hardhat test test_energy_analysis.js
```

### Deployment

Deploy contracts to a local or test network:
```bash
npx hardhat run scripts/deploy.js --network localhost
```

## Smart Contracts
- **ConstituencyToken**: ERC20 token with voting capabilities.
- **Voting**: Manages candidate registration and vote casting.
- **RollupBridge**: Handles rollup operations and constituency result aggregation.
- **NationalTally**: Aggregates division results and finalizes outcomes.

## Gas and Energy Analysis
The project includes an in-depth analysis of gas usage and energy consumption for each major operation.
- **gas_measurement_summary.md**: Details on gas consumption for key operations.
- **energy_consumption_summary.md**: Environmental impact and energy use assessment.

## Security
All contracts are secured with OpenZeppelin libraries and respect best security practices.

## Contribution
Contributions are welcomed! Please create a pull request or report issues you find.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
