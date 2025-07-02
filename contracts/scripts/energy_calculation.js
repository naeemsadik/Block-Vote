const { ethers } = require("hardhat");

// Energy consumption data for different blockchain networks (per transaction/gas unit)
const NETWORK_ENERGY_DATA = {
  ethereum_pow: {
    name: "Ethereum (Proof of Work)",
    energyPerTransaction: 692.77, // kWh per transaction (historical data before PoS)
    energyPerGas: 0.000369, // kWh per gas unit (estimated)
    carbonFootprintPerKwh: 0.5, // kg CO2 per kWh (global average)
    description: "Legacy Ethereum with Proof of Work consensus"
  },
  ethereum_pos: {
    name: "Ethereum (Proof of Stake)",
    energyPerTransaction: 0.0026, // kWh per transaction (after merge)
    energyPerGas: 0.00000000138, // kWh per gas unit (99.95% reduction)
    carbonFootprintPerKwh: 0.5,
    description: "Current Ethereum with Proof of Stake consensus"
  },
  polygon: {
    name: "Polygon (Matic)",
    energyPerTransaction: 0.00079, // kWh per transaction
    energyPerGas: 0.0000000042, // kWh per gas unit
    carbonFootprintPerKwh: 0.5,
    description: "Polygon Layer 2 solution"
  },
  bsc: {
    name: "Binance Smart Chain",
    energyPerTransaction: 0.0034, // kWh per transaction
    energyPerGas: 0.0000000018, // kWh per gas unit
    carbonFootprintPerKwh: 0.6,
    description: "Binance Smart Chain (BNB Chain)"
  },
  arbitrum: {
    name: "Arbitrum One",
    energyPerTransaction: 0.00052, // kWh per transaction
    energyPerGas: 0.0000000028, // kWh per gas unit
    carbonFootprintPerKwh: 0.5,
    description: "Arbitrum Layer 2 rollup"
  },
  optimism: {
    name: "Optimism",
    energyPerTransaction: 0.00048, // kWh per transaction
    energyPerGas: 0.0000000025, // kWh per gas unit
    carbonFootprintPerKwh: 0.5,
    description: "Optimism Layer 2 rollup"
  }
};

// Energy calculation utilities
class EnergyCalculator {
  constructor() {
    this.gasUsageData = {};
    this.totalGasUsed = 0n;
  }

  // Record gas usage for different operations
  recordGasUsage(operation, gasUsed, description = "") {
    if (!this.gasUsageData[operation]) {
      this.gasUsageData[operation] = {
        totalGas: 0n,
        count: 0,
        description: description,
        transactions: []
      };
    }
    
    this.gasUsageData[operation].totalGas += gasUsed;
    this.gasUsageData[operation].count += 1;
    this.gasUsageData[operation].transactions.push(gasUsed);
    this.totalGasUsed += gasUsed;
  }

  // Calculate energy consumption for a specific network
  calculateEnergyForNetwork(networkKey) {
    const network = NETWORK_ENERGY_DATA[networkKey];
    if (!network) {
      throw new Error(`Unknown network: ${networkKey}`);
    }

    const results = {
      network: network,
      operations: {},
      totals: {
        totalGas: this.totalGasUsed,
        totalEnergyKwh: 0,
        totalCarbonKg: 0,
        totalTransactions: 0
      }
    };

    // Calculate energy for each operation
    for (const [operation, data] of Object.entries(this.gasUsageData)) {
      const energyKwh = Number(data.totalGas) * network.energyPerGas;
      const carbonKg = energyKwh * network.carbonFootprintPerKwh;
      
      results.operations[operation] = {
        description: data.description,
        gasUsed: data.totalGas.toString(),
        transactionCount: data.count,
        averageGasPerTx: data.count > 0 ? (data.totalGas / BigInt(data.count)).toString() : "0",
        energyConsumption: {
          totalKwh: energyKwh,
          averageKwhPerTx: data.count > 0 ? energyKwh / data.count : 0,
          carbonFootprint: carbonKg,
          averageCarbonPerTx: data.count > 0 ? carbonKg / data.count : 0
        },
        equivalent: this.calculateEnergyEquivalents(energyKwh)
      };

      results.totals.totalEnergyKwh += energyKwh;
      results.totals.totalCarbonKg += carbonKg;
      results.totals.totalTransactions += data.count;
    }

    results.totals.equivalent = this.calculateEnergyEquivalents(results.totals.totalEnergyKwh);
    results.totals.scalingProjections = this.calculateScalingProjections(results.totals, network);

    return results;
  }

  // Calculate real-world energy equivalents
  calculateEnergyEquivalents(kWh) {
    return {
      // Household equivalents
      householdDays: kWh / 30, // Average household uses 30 kWh/day
      lightBulbHours: kWh / 0.01, // 10W LED bulb
      tvHours: kWh / 0.15, // 150W TV
      laptopHours: kWh / 0.05, // 50W laptop
      
      // Transportation equivalents
      electricCarKm: kWh / 0.2, // Electric car: ~0.2 kWh/km
      gasolineCarKm: (kWh * 3.6) / 33.7, // Gasoline equivalent (33.7 MJ/liter)
      
      // Energy production equivalents
      solarPanelHours: kWh / 0.3, // 300W solar panel in good conditions
      windTurbineSeconds: kWh / 2000, // 2MW wind turbine
      
      // Environmental equivalents
      treesNeeded: (kWh * 0.5) / 21.77, // Trees needed to offset CO2 (21.77 kg CO2/year per tree)
    };
  }

  // Calculate projections for different election scales
  calculateScalingProjections(totals, network) {
    const scales = [
      { name: "Local Election", voters: 10000, multiplier: 1000 },
      { name: "State Election", voters: 1000000, multiplier: 100000 },
      { name: "National Election", voters: 50000000, multiplier: 5000000 },
      { name: "Global Election", voters: 1000000000, multiplier: 100000000 }
    ];

    return scales.map(scale => {
      const scaledEnergy = totals.totalEnergyKwh * scale.multiplier;
      const scaledCarbon = totals.totalCarbonKg * scale.multiplier;
      
      return {
        scale: scale.name,
        voters: scale.voters,
        estimatedEnergy: {
          kWh: scaledEnergy,
          MWh: scaledEnergy / 1000,
          GWh: scaledEnergy / 1000000,
        },
        carbonFootprint: {
          kg: scaledCarbon,
          tonnes: scaledCarbon / 1000,
        },
        cost: {
          usd: scaledEnergy * 0.12, // $0.12 per kWh average
          eur: scaledEnergy * 0.10, // €0.10 per kWh average
        },
        equivalent: this.calculateEnergyEquivalents(scaledEnergy)
      };
    });
  }

  // Generate comprehensive energy report
  generateEnergyReport() {
    console.log('\n=== COMPREHENSIVE ENERGY ANALYSIS REPORT ===\n');
    
    // Calculate for multiple networks
    const networks = ['ethereum_pos', 'ethereum_pow', 'polygon', 'arbitrum', 'optimism'];
    const networkResults = {};

    for (const networkKey of networks) {
      networkResults[networkKey] = this.calculateEnergyForNetwork(networkKey);
    }

    // Display results for each network
    for (const [networkKey, results] of Object.entries(networkResults)) {
      this.displayNetworkResults(networkKey, results);
    }

    // Comparative analysis
    this.displayComparativeAnalysis(networkResults);

    return networkResults;
  }

  displayNetworkResults(networkKey, results) {
    console.log(`\n--- ${results.network.name} ---`);
    console.log(`Description: ${results.network.description}`);
    console.log(`Energy per gas: ${results.network.energyPerGas} kWh`);
    console.log(`Carbon footprint: ${results.network.carbonFootprintPerKwh} kg CO2/kWh\n`);

    // Operation breakdown
    console.log('Operation Breakdown:');
    for (const [operation, data] of Object.entries(results.operations)) {
      console.log(`\n  ${operation.toUpperCase()}:`);
      console.log(`    Gas used: ${data.gasUsed} gas`);
      console.log(`    Transactions: ${data.transactionCount}`);
      console.log(`    Energy: ${data.energyConsumption.totalKwh.toFixed(6)} kWh`);
      console.log(`    Carbon: ${data.energyConsumption.carbonFootprint.toFixed(6)} kg CO2`);
      console.log(`    Equivalent to: ${data.equivalent.lightBulbHours.toFixed(2)} hours of LED light`);
    }

    // Totals
    console.log(`\n  TOTALS:`);
    console.log(`    Total gas: ${results.totals.totalGas.toString()} gas`);
    console.log(`    Total energy: ${results.totals.totalEnergyKwh.toFixed(6)} kWh`);
    console.log(`    Total carbon: ${results.totals.totalCarbonKg.toFixed(6)} kg CO2`);
    console.log(`    Equivalent to: ${results.totals.equivalent.householdDays.toFixed(3)} days of household energy`);

    // Scaling projections
    console.log(`\n  SCALING PROJECTIONS:`);
    results.totals.scalingProjections.forEach(projection => {
      console.log(`\n    ${projection.scale} (${projection.voters.toLocaleString()} voters):`);
      console.log(`      Energy: ${projection.estimatedEnergy.MWh.toFixed(2)} MWh`);
      console.log(`      Carbon: ${projection.carbonFootprint.tonnes.toFixed(2)} tonnes CO2`);
      console.log(`      Cost: $${projection.cost.usd.toFixed(2)} USD`);
      console.log(`      Equivalent: ${projection.equivalent.electricCarKm.toFixed(0)} km in electric car`);
    });
  }

  displayComparativeAnalysis(networkResults) {
    console.log('\n=== COMPARATIVE NETWORK ANALYSIS ===\n');
    
    const comparison = Object.entries(networkResults).map(([key, results]) => ({
      network: results.network.name,
      energyKwh: results.totals.totalEnergyKwh,
      carbonKg: results.totals.totalCarbonKg,
      energyPerGas: results.network.energyPerGas
    }));

    // Sort by energy consumption
    comparison.sort((a, b) => a.energyKwh - b.energyKwh);

    console.log('Energy Efficiency Ranking (lowest to highest):');
    comparison.forEach((network, index) => {
      console.log(`${index + 1}. ${network.network}`);
      console.log(`   Energy: ${network.energyKwh.toFixed(6)} kWh`);
      console.log(`   Carbon: ${network.carbonKg.toFixed(6)} kg CO2`);
      console.log(`   Efficiency: ${network.energyPerGas.toExponential(2)} kWh/gas\n`);
    });

    // Energy savings comparison
    const leastEfficient = comparison[comparison.length - 1];
    const mostEfficient = comparison[0];
    
    const energySavings = leastEfficient.energyKwh - mostEfficient.energyKwh;
    const carbonSavings = leastEfficient.carbonKg - mostEfficient.carbonKg;
    const percentageSavings = ((energySavings / leastEfficient.energyKwh) * 100);

    console.log('Environmental Impact Comparison:');
    console.log(`Using ${mostEfficient.network} instead of ${leastEfficient.network}:`);
    console.log(`  Energy savings: ${energySavings.toFixed(6)} kWh (${percentageSavings.toFixed(2)}%)`);
    console.log(`  Carbon savings: ${carbonSavings.toFixed(6)} kg CO2`);
    console.log(`  Equivalent to: ${(energySavings * 100).toFixed(0)} hours of LED lighting saved\n`);
  }
}

// Main function to run energy analysis
async function runEnergyAnalysis() {
  console.log("=== BLOCK VOTE SYSTEM - ENERGY CONSUMPTION ANALYSIS ===\n");
  
  const calculator = new EnergyCalculator();
  
  // Get signers
  const [owner, ...voters] = await ethers.getSigners();
  
  // Deploy contracts and measure gas
  console.log("Deploying contracts and measuring gas usage...");
  
  const ConstituencyToken = await ethers.getContractFactory('ConstituencyToken');
  const constituencyToken = await ConstituencyToken.deploy(
    "VoteToken", 
    "VOTE", 
    ethers.parseEther("500000")
  );
  const tokenDeployment = await constituencyToken.deploymentTransaction().wait();
  calculator.recordGasUsage('contract_deployment', tokenDeployment.gasUsed, 'ConstituencyToken deployment');
  
  const Voting = await ethers.getContractFactory('Voting');
  const voting = await Voting.deploy(await constituencyToken.getAddress());
  const votingDeployment = await voting.deploymentTransaction().wait();
  calculator.recordGasUsage('contract_deployment', votingDeployment.gasUsed, 'Voting contract deployment');
  
  const RollupBridge = await ethers.getContractFactory('RollupBridge');
  const rollupBridge = await RollupBridge.deploy();
  const rollupDeployment = await rollupBridge.deploymentTransaction().wait();
  calculator.recordGasUsage('contract_deployment', rollupDeployment.gasUsed, 'RollupBridge deployment');

  // Setup phase
  console.log("Setting up candidates and voters...");
  const candidates = ["Alice Johnson", "Bob Smith", "Carol Davis"];
  for (const name of candidates) {
    const tx1 = await voting.addCandidate(name, "Party");
    const receipt1 = await tx1.wait();
    calculator.recordGasUsage('setup_operations', receipt1.gasUsed, 'Add candidate to voting contract');
  }

  const startTx = await voting.startVoting(86400);
  const startReceipt = await startTx.wait();
  calculator.recordGasUsage('setup_operations', startReceipt.gasUsed, 'Start voting period');

  // Mint tokens to voters
  for (let i = 0; i < 10; i++) {
    const tx = await constituencyToken.mint(voters[i].address, ethers.parseEther("50"));
    const receipt = await tx.wait();
    calculator.recordGasUsage('token_operations', receipt.gasUsed, 'Mint voting tokens');
  }

  // Vote casting phase
  console.log("Casting votes...");
  for (let i = 0; i < 10; i++) {
    const tx = await voting.connect(voters[i]).castVote((i % 3) + 1);
    const receipt = await tx.wait();
    calculator.recordGasUsage('vote_casting', receipt.gasUsed, 'Cast individual vote');
  }

  // Rollup operations
  console.log("Performing rollup operations...");
  const merkleRoot = ethers.keccak256(ethers.toUtf8Bytes('constituency_votes'));
  const candidateIds = [1, 2, 3];
  const candidateVotes = [4, 3, 3];

  const rollupTx = await rollupBridge.connect(owner).submitConstituencyResult(
    1, merkleRoot, 10, candidateIds, candidateVotes
  );
  const rollupReceipt = await rollupTx.wait();
  calculator.recordGasUsage('rollup_operations', rollupReceipt.gasUsed, 'Submit constituency result');

  // Advance time and create batch
  await ethers.provider.send("evm_increaseTime", [3600]);
  await ethers.provider.send("evm_mine");
  await rollupBridge.forceVerifyConstituency(1);

  const batchTx = await rollupBridge.createRollupBatch([1]);
  const batchReceipt = await batchTx.wait();
  calculator.recordGasUsage('rollup_operations', batchReceipt.gasUsed, 'Create rollup batch');

  // Generate comprehensive energy report
  const energyResults = calculator.generateEnergyReport();
  
  return energyResults;
}

// Export for use in other scripts
module.exports = { EnergyCalculator, NETWORK_ENERGY_DATA, runEnergyAnalysis };

// Run if called directly
if (require.main === module) {
  runEnergyAnalysis()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
