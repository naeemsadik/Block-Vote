const { expect } = require('chai');
const { ethers } = require('hardhat');
const { EnergyCalculator, NETWORK_ENERGY_DATA } = require('./scripts/energy_calculation');

describe('Block Vote System - Comprehensive Gas & Energy Analysis', function() {
  let constituencyToken, voting, rollupBridge, nationalTally;
  let owner, validators, voters;
  let energyCalculator;
  
  before(async function() {
    // Initialize energy calculator
    energyCalculator = new EnergyCalculator();
    
    // Get signers (owner + 2 validators + 10 voters)
    const signers = await ethers.getSigners();
    owner = signers[0];
    validators = [signers[1], signers[2]];
    voters = signers.slice(3, 13); // 10 voters
    
    console.log(`\n=== DEPLOYING CONTRACTS & MEASURING ENERGY ===`);
    
    // Deploy ConstituencyToken
    const ConstituencyToken = await ethers.getContractFactory('ConstituencyToken');
    constituencyToken = await ConstituencyToken.deploy(
      "VoteToken", 
      "VOTE", 
      ethers.parseEther("500000")
    );
    const tokenDeploymentGas = (await constituencyToken.deploymentTransaction().wait()).gasUsed;
    energyCalculator.recordGasUsage('contract_deployment', tokenDeploymentGas, 'ConstituencyToken deployment');
    console.log(`ConstituencyToken deployment: ${tokenDeploymentGas.toString()} gas`);
    
    // Deploy Voting contract
    const Voting = await ethers.getContractFactory('Voting');
    voting = await Voting.deploy(await constituencyToken.getAddress());
    const votingDeploymentGas = (await voting.deploymentTransaction().wait()).gasUsed;
    energyCalculator.recordGasUsage('contract_deployment', votingDeploymentGas, 'Voting contract deployment');
    console.log(`Voting deployment: ${votingDeploymentGas.toString()} gas`);
    
    // Deploy RollupBridge
    const RollupBridge = await ethers.getContractFactory('RollupBridge');
    rollupBridge = await RollupBridge.deploy();
    const rollupDeploymentGas = (await rollupBridge.deploymentTransaction().wait()).gasUsed;
    energyCalculator.recordGasUsage('contract_deployment', rollupDeploymentGas, 'RollupBridge deployment');
    console.log(`RollupBridge deployment: ${rollupDeploymentGas.toString()} gas`);
    
    // Deploy NationalTally
    const NationalTally = await ethers.getContractFactory('NationalTally');
    nationalTally = await NationalTally.deploy(2); // Expect 2 divisions
    const nationalDeploymentGas = (await nationalTally.deploymentTransaction().wait()).gasUsed;
    energyCalculator.recordGasUsage('contract_deployment', nationalDeploymentGas, 'NationalTally deployment');
    console.log(`NationalTally deployment: ${nationalDeploymentGas.toString()} gas`);
    
    // Setup: Add candidates
    console.log(`\n=== SETUP PHASE ===`);
    const candidates = [
      {name: "Alice Johnson", party: "Progressive Party"},
      {name: "Bob Smith", party: "Conservative Party"},
      {name: "Carol Davis", party: "Independent Party"},
      {name: "David Wilson", party: "Green Party"},
      {name: "Eve Brown", party: "Liberal Party"}
    ];
    
    for (const candidate of candidates) {
      const tx1 = await voting.addCandidate(candidate.name, candidate.party);
      const receipt1 = await tx1.wait();
      energyCalculator.recordGasUsage('setup_operations', receipt1.gasUsed, 'Add candidate to voting');
      
      const tx2 = await nationalTally.addCandidate(candidate.name, candidate.party);
      const receipt2 = await tx2.wait();
      energyCalculator.recordGasUsage('setup_operations', receipt2.gasUsed, 'Add candidate to national');
    }
    
    // Setup: Start voting
    const startTx = await voting.startVoting(86400);
    const startReceipt = await startTx.wait();
    energyCalculator.recordGasUsage('setup_operations', startReceipt.gasUsed, 'Start voting period');
    
    // Setup: Mint tokens to voters
    for (let i = 0; i < voters.length; i++) {
      const tx = await constituencyToken.mint(voters[i].address, ethers.parseEther("100"));
      const receipt = await tx.wait();
      energyCalculator.recordGasUsage('token_operations', receipt.gasUsed, 'Mint voting tokens');
    }
    
    // Setup validators
    await rollupBridge.addValidator(validators[0].address);
    await rollupBridge.addValidator(validators[1].address);
    await nationalTally.authorizeDivisionValidator(validators[0].address);
    await nationalTally.authorizeNationalValidator(owner.address);
    await nationalTally.authorizeNationalValidator(validators[0].address);
  });

  describe('1. Vote Casting with Energy Analysis', function() {
    it('Should measure gas and energy for 10 individual votes', async function() {
      console.log('\n=== VOTE CASTING PHASE ===');
      
      const votingResults = [];
      
      for (let i = 0; i < voters.length; i++) {
        const candidateId = (i % 5) + 1; // Distribute votes among 5 candidates
        
        console.log(`Voter ${i + 1} casting vote for candidate ${candidateId}...`);
        
        // Cast vote and measure gas
        const tx = await voting.connect(voters[i]).castVote(candidateId);
        const receipt = await tx.wait();
        
        const gasUsed = receipt.gasUsed;
        energyCalculator.recordGasUsage('vote_casting', gasUsed, 'Individual vote casting');
        
        votingResults.push({
          voter: i + 1,
          candidateId: candidateId,
          gasUsed: gasUsed.toString()
        });
        
        console.log(`  Gas used: ${gasUsed.toString()}`);
      }
      
      console.log(`\n=== VOTE CASTING COMPLETED ===`);
      console.log(`Total votes cast: ${voters.length}`);
      
      // Calculate energy for current votes on different networks
      console.log(`\n=== ENERGY IMPACT PER NETWORK (10 votes) ===`);
      const voteGasTotal = votingResults.reduce((sum, vote) => sum + BigInt(vote.gasUsed), 0n);
      
      Object.entries(NETWORK_ENERGY_DATA).forEach(([key, network]) => {
        const energyKwh = Number(voteGasTotal) * network.energyPerGas;
        const carbonKg = energyKwh * network.carbonFootprintPerKwh;
        
        console.log(`\n${network.name}:`);
        console.log(`  Energy: ${energyKwh.toFixed(8)} kWh`);
        console.log(`  Carbon: ${carbonKg.toFixed(8)} kg CO2`);
        console.log(`  Equivalent: ${(energyKwh / 0.01).toFixed(2)} hours of LED lighting`);
      });
      
      // Verify all votes were cast
      const stats = await voting.getVotingStats();
      expect(stats[0]).to.equal(voters.length);
    });

    it('Should measure energy for vote verification operations', async function() {
      console.log('\n=== VOTE VERIFICATION ENERGY ===');
      
      // Generate and update merkle root
      const voter1Vote = await voting.getVoterVote(voters[0].address);
      const leaf = await voting.generateVoteLeaf(
        voters[0].address, 
        voter1Vote.candidateId, 
        voter1Vote.timestamp
      );
      
      const tx = await voting.updateMerkleRoot(leaf);
      const receipt = await tx.wait();
      energyCalculator.recordGasUsage('validation_operations', receipt.gasUsed, 'Merkle root update');
      
      console.log(`Merkle root update gas: ${receipt.gasUsed.toString()}`);
      
      // Calculate energy for this operation across networks
      Object.entries(NETWORK_ENERGY_DATA).slice(0, 3).forEach(([key, network]) => {
        const energyKwh = Number(receipt.gasUsed) * network.energyPerGas;
        console.log(`${network.name}: ${energyKwh.toFixed(8)} kWh`);
      });
    });
  });

  describe('2. Rollup Operations Energy Analysis', function() {
    it('Should measure energy for constituency result operations', async function() {
      console.log('\n=== ROLLUP OPERATIONS ENERGY ===');
      
      // Submit constituency result 1
      const merkleRoot1 = ethers.keccak256(ethers.toUtf8Bytes('constituency1_10votes'));
      const candidateIds = [1, 2, 3, 4, 5];
      const candidateVotes1 = [3, 2, 2, 2, 1]; // Distribution of 10 votes
      
      const tx1 = await rollupBridge.connect(validators[0]).submitConstituencyResult(
        1, merkleRoot1, 10, candidateIds, candidateVotes1
      );
      const receipt1 = await tx1.wait();
      energyCalculator.recordGasUsage('rollup_operations', receipt1.gasUsed, 'Constituency result submission');
      console.log(`Constituency 1 submission: ${receipt1.gasUsed.toString()} gas`);
      
      // Submit constituency result 2
      const merkleRoot2 = ethers.keccak256(ethers.toUtf8Bytes('constituency2_8votes'));
      const candidateVotes2 = [2, 2, 2, 1, 1]; // Distribution of 8 votes
      
      const tx2 = await rollupBridge.connect(validators[1]).submitConstituencyResult(
        2, merkleRoot2, 8, candidateIds, candidateVotes2
      );
      const receipt2 = await tx2.wait();
      energyCalculator.recordGasUsage('rollup_operations', receipt2.gasUsed, 'Constituency result submission');
      console.log(`Constituency 2 submission: ${receipt2.gasUsed.toString()} gas`);
      
      // Verification operations
      const leaf1 = ethers.keccak256(ethers.toUtf8Bytes('proof1'));
      const verifyTx1 = await rollupBridge.connect(validators[0]).verifyConstituencyResult(1, [], leaf1);
      const verifyReceipt1 = await verifyTx1.wait();
      energyCalculator.recordGasUsage('validation_operations', verifyReceipt1.gasUsed, 'Constituency verification');
      
      const leaf2 = ethers.keccak256(ethers.toUtf8Bytes('proof2'));
      const verifyTx2 = await rollupBridge.connect(validators[1]).verifyConstituencyResult(2, [], leaf2);
      const verifyReceipt2 = await verifyTx2.wait();
      energyCalculator.recordGasUsage('validation_operations', verifyReceipt2.gasUsed, 'Constituency verification');
      
      console.log(`Verification operations: ${(verifyReceipt1.gasUsed + verifyReceipt2.gasUsed).toString()} gas total`);
    });

    it('Should measure energy for rollup batch creation', async function() {
      console.log('\n=== ROLLUP BATCH ENERGY ===');
      
      // Force verify constituencies and advance time
      await rollupBridge.forceVerifyConstituency(1);
      await rollupBridge.forceVerifyConstituency(2);
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");
      
      // Create rollup batch
      const tx = await rollupBridge.connect(validators[0]).createRollupBatch([1, 2]);
      const receipt = await tx.wait();
      energyCalculator.recordGasUsage('rollup_operations', receipt.gasUsed, 'Rollup batch creation');
      console.log(`Rollup batch creation: ${receipt.gasUsed.toString()} gas`);
      
      // Sign the batch
      const signTx1 = await rollupBridge.connect(validators[0]).signRollupBatch(1);
      const signReceipt1 = await signTx1.wait();
      energyCalculator.recordGasUsage('rollup_operations', signReceipt1.gasUsed, 'Batch signature');
      
      const signTx2 = await rollupBridge.connect(validators[1]).signRollupBatch(1);
      const signReceipt2 = await signTx2.wait();
      energyCalculator.recordGasUsage('rollup_operations', signReceipt2.gasUsed, 'Batch signature');
      
      console.log(`Batch signatures: ${(signReceipt1.gasUsed + signReceipt2.gasUsed).toString()} gas total`);
    });
  });

  describe('3. National Level Energy Analysis', function() {
    it('Should measure energy for national operations', async function() {
      console.log('\n=== NATIONAL OPERATIONS ENERGY ===');
      
      // Submit division results to national tally
      const aggregatedRoot1 = ethers.keccak256(ethers.toUtf8Bytes('division1_aggregated'));
      const candidateIds = [1, 2, 3, 4, 5];
      const divisionVotes1 = [50, 30, 25, 20, 15]; // Simulated division totals
      
      const tx1 = await nationalTally.connect(validators[0]).submitDivisionResult(
        1, aggregatedRoot1, 140, candidateIds, divisionVotes1
      );
      const receipt1 = await tx1.wait();
      energyCalculator.recordGasUsage('national_operations', receipt1.gasUsed, 'Division result submission');
      console.log(`Division 1 national submission: ${receipt1.gasUsed.toString()} gas`);
      
      // Submit division 2
      const aggregatedRoot2 = ethers.keccak256(ethers.toUtf8Bytes('division2_aggregated'));
      const divisionVotes2 = [45, 35, 30, 25, 20];
      
      const tx2 = await nationalTally.connect(validators[0]).submitDivisionResult(
        2, aggregatedRoot2, 155, candidateIds, divisionVotes2
      );
      const receipt2 = await tx2.wait();
      energyCalculator.recordGasUsage('national_operations', receipt2.gasUsed, 'Division result submission');
      console.log(`Division 2 national submission: ${receipt2.gasUsed.toString()} gas`);
      
      // National verification
      const leaf1 = ethers.keccak256(ethers.toUtf8Bytes('national_proof_1'));
      const verifyTx1 = await nationalTally.connect(owner).verifyDivisionResult(1, [], leaf1);
      const verifyReceipt1 = await verifyTx1.wait();
      energyCalculator.recordGasUsage('validation_operations', verifyReceipt1.gasUsed, 'National verification');
      
      const leaf2 = ethers.keccak256(ethers.toUtf8Bytes('national_proof_2'));
      const verifyTx2 = await nationalTally.connect(owner).verifyDivisionResult(2, [], leaf2);
      const verifyReceipt2 = await verifyTx2.wait();
      energyCalculator.recordGasUsage('validation_operations', verifyReceipt2.gasUsed, 'National verification');
      
      console.log(`National verification: ${(verifyReceipt1.gasUsed + verifyReceipt2.gasUsed).toString()} gas total`);
    });
  });

  describe('4. Comprehensive Energy Report & Analysis', function() {
    it('Should generate detailed energy consumption report across all networks', async function() {
      console.log('\n=== GENERATING COMPREHENSIVE ENERGY REPORT ===');
      
      // Generate energy report for all networks
      const energyResults = energyCalculator.generateEnergyReport();
      
      // Additional detailed analysis
      console.log('\n=== DETAILED ENERGY BREAKDOWN BY OPERATION ===');
      
      // Calculate totals by operation category
      const operationTotals = {};
      Object.entries(energyCalculator.gasUsageData).forEach(([operation, data]) => {
        const category = categorizeOperation(operation);
        if (!operationTotals[category]) {
          operationTotals[category] = { gas: 0n, count: 0 };
        }
        operationTotals[category].gas += data.totalGas;
        operationTotals[category].count += data.count;
      });
      
      console.log('\nOperation Category Summary:');
      Object.entries(operationTotals).forEach(([category, totals]) => {
        console.log(`${category}: ${totals.gas.toString()} gas (${totals.count} transactions)`);
      });
      
      function categorizeOperation(operation) {
        if (operation.includes('vote_casting')) return 'Vote Casting';
        if (operation.includes('validation')) return 'Validation';
        if (operation.includes('rollup')) return 'Rollup Operations';
        if (operation.includes('national')) return 'National Operations';
        if (operation.includes('token')) return 'Token Operations';
        if (operation.includes('setup')) return 'Setup Operations';
        if (operation.includes('deployment')) return 'Contract Deployment';
        return 'Other';
      }
      
      // Calculate environmental impact projections
      calculateEnvironmentalProjections(energyResults);
      
      function calculateEnvironmentalProjections(energyResults) {
        console.log('\n=== ENVIRONMENTAL IMPACT PROJECTIONS ===');
        
        // Focus on Ethereum PoS for realistic projections
        const ethResults = energyResults.ethereum_pos;
        const totalEnergyKwh = ethResults.totals.totalEnergyKwh;
        
        console.log('\nFor current test (10 votes + infrastructure):');
        console.log(`Energy consumed: ${totalEnergyKwh.toFixed(8)} kWh`);
        console.log(`Carbon footprint: ${ethResults.totals.totalCarbonKg.toFixed(8)} kg CO2`);
        
        // Real-world election projections
        const electionScales = [
          { name: 'City Election', voters: 100000, factor: 10000 },
          { name: 'State Election', voters: 5000000, factor: 500000 },
          { name: 'US Presidential Election', voters: 160000000, factor: 16000000 },
          { name: 'Global Democratic Vote', voters: 2000000000, factor: 200000000 }
        ];
        
        console.log('\nProjected environmental impact for larger elections:');
        electionScales.forEach(scale => {
          const scaledEnergy = totalEnergyKwh * scale.factor;
          const scaledCarbon = ethResults.totals.totalCarbonKg * scale.factor;
          
          console.log(`\n${scale.name} (${scale.voters.toLocaleString()} voters):`);
          console.log(`  Energy: ${scaledEnergy.toFixed(2)} kWh`);
          console.log(`  Carbon: ${scaledCarbon.toFixed(2)} kg CO2`);
          console.log(`  Cost: $${(scaledEnergy * 0.12).toFixed(2)} USD`);
          console.log(`  Trees to offset: ${(scaledCarbon / 21.77).toFixed(0)} trees needed for 1 year`);
        });
        
        // Comparison with traditional voting
        console.log('\n=== COMPARISON WITH TRADITIONAL VOTING ===');
        console.log('Traditional paper-based election environmental impact:');
        console.log('- Paper production, printing, transportation');
        console.log('- Polling station energy consumption');
        console.log('- Staff transportation and logistics');
        console.log('- Estimated: 2-5 kg CO2 per voter for national election');
        console.log('');
        console.log('Blockchain voting (Ethereum PoS):');
        console.log(`- Current system: ${(ethResults.totals.totalCarbonKg * 1000000).toFixed(8)} kg CO2 per voter`);
        console.log('- Significantly lower carbon footprint');
        console.log('- Reduced physical infrastructure needs');
        console.log('- 24/7 accessibility without additional energy');
      }
      
      // Validate energy calculations
      expect(energyResults).to.have.property('ethereum_pos');
      expect(energyResults).to.have.property('ethereum_pow');
      expect(energyResults.ethereum_pos.totals.totalEnergyKwh).to.be.greaterThan(0);
      
      console.log('\n=== ENERGY ANALYSIS COMPLETE ===');
    });
  });
});
