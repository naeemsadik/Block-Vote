const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Comprehensive Gas Measurement Report - Block Vote System', function() {
  let constituencyToken, voting, rollupBridge, nationalTally;
  let owner, validators, voters;
  
  // Gas tracking variables
  let totalVotingGas = 0n;
  let totalValidationGas = 0n;
  let totalRollupGas = 0n;
  let totalNationalGas = 0n;
  
  before(async function() {
    // Get signers (owner + 2 validators + 10 voters)
    const signers = await ethers.getSigners();
    owner = signers[0];
    validators = [signers[1], signers[2]];
    voters = signers.slice(3, 13); // 10 voters
    
    console.log(`\n=== DEPLOYING CONTRACTS ===`);
    
    // Deploy ConstituencyToken
    const ConstituencyToken = await ethers.getContractFactory('ConstituencyToken');
    constituencyToken = await ConstituencyToken.deploy(
      "VoteToken", 
      "VOTE", 
      ethers.parseEther("500000")
    );
    const tokenDeploymentGas = (await constituencyToken.deploymentTransaction().wait()).gasUsed;
    console.log(`ConstituencyToken deployment gas: ${tokenDeploymentGas.toString()}`);
    
    // Deploy Voting contract
    const Voting = await ethers.getContractFactory('Voting');
    voting = await Voting.deploy(await constituencyToken.getAddress());
    const votingDeploymentGas = (await voting.deploymentTransaction().wait()).gasUsed;
    console.log(`Voting contract deployment gas: ${votingDeploymentGas.toString()}`);
    
    // Deploy RollupBridge
    const RollupBridge = await ethers.getContractFactory('RollupBridge');
    rollupBridge = await RollupBridge.deploy();
    const rollupDeploymentGas = (await rollupBridge.deploymentTransaction().wait()).gasUsed;
    console.log(`RollupBridge deployment gas: ${rollupDeploymentGas.toString()}`);
    
    // Deploy NationalTally
    const NationalTally = await ethers.getContractFactory('NationalTally');
    nationalTally = await NationalTally.deploy(2); // Expect 2 divisions
    const nationalDeploymentGas = (await nationalTally.deploymentTransaction().wait()).gasUsed;
    console.log(`NationalTally deployment gas: ${nationalDeploymentGas.toString()}`);
    
    const totalDeploymentGas = tokenDeploymentGas + votingDeploymentGas + rollupDeploymentGas + nationalDeploymentGas;
    console.log(`Total deployment gas: ${totalDeploymentGas.toString()}`);
    
    // Setup: Add candidates
    console.log(`\n=== SETTING UP CANDIDATES ===`);
    const candidates = [
      {name: "Alice Johnson", party: "Progressive Party"},
      {name: "Bob Smith", party: "Conservative Party"},
      {name: "Carol Davis", party: "Independent Party"},
      {name: "David Wilson", party: "Green Party"},
      {name: "Eve Brown", party: "Liberal Party"}
    ];
    
    let setupGas = 0n;
    for (const candidate of candidates) {
      const tx1 = await voting.addCandidate(candidate.name, candidate.party);
      const receipt1 = await tx1.wait();
      setupGas += receipt1.gasUsed;
      
      const tx2 = await nationalTally.addCandidate(candidate.name, candidate.party);
      const receipt2 = await tx2.wait();
      setupGas += receipt2.gasUsed;
    }
    console.log(`Total setup gas for ${candidates.length} candidates: ${setupGas.toString()}`);
    
    // Setup: Start voting
    const startTx = await voting.startVoting(86400);
    const startReceipt = await startTx.wait();
    setupGas += startReceipt.gasUsed;
    console.log(`Start voting gas: ${startReceipt.gasUsed.toString()}`);
    
    // Setup: Mint tokens to voters
    console.log(`\n=== MINTING TOKENS TO VOTERS ===`);
    let mintingGas = 0n;
    for (let i = 0; i < voters.length; i++) {
      const tx = await constituencyToken.mint(voters[i].address, ethers.parseEther("100"));
      const receipt = await tx.wait();
      mintingGas += receipt.gasUsed;
    }
    console.log(`Total minting gas for ${voters.length} voters: ${mintingGas.toString()}`);
    console.log(`Average minting gas per voter: ${(mintingGas / BigInt(voters.length)).toString()}`);
    
    // Setup validators
    await rollupBridge.addValidator(validators[0].address);
    await rollupBridge.addValidator(validators[1].address);
    await nationalTally.authorizeDivisionValidator(validators[0].address);
    await nationalTally.authorizeNationalValidator(owner.address);
    await nationalTally.authorizeNationalValidator(validators[0].address);
  });

  describe('1. Vote Casting Gas Analysis (10 Votes)', function() {
    it('Should measure gas for casting 10 individual votes', async function() {
      console.log('\n=== VOTE CASTING GAS MEASUREMENTS (10 VOTES) ===');
      
      const votingGasResults = [];
      
      for (let i = 0; i < voters.length; i++) {
        const candidateId = (i % 5) + 1; // Distribute votes among 5 candidates
        
        console.log(`\nVoter ${i + 1} casting vote for candidate ${candidateId}...`);
        
        // Estimate gas first
        const estimatedGas = await voting.connect(voters[i]).castVote.estimateGas(candidateId);
        
        // Cast actual vote
        const tx = await voting.connect(voters[i]).castVote(candidateId);
        const receipt = await tx.wait();
        
        const gasUsed = receipt.gasUsed;
        totalVotingGas += gasUsed;
        votingGasResults.push({
          voter: i + 1,
          candidateId: candidateId,
          estimatedGas: estimatedGas.toString(),
          actualGas: gasUsed.toString(),
          difference: (gasUsed - estimatedGas).toString()
        });
        
        console.log(`  Estimated gas: ${estimatedGas.toString()}`);
        console.log(`  Actual gas: ${gasUsed.toString()}`);
        console.log(`  Difference: ${(gasUsed - estimatedGas).toString()}`);
      }
      
      console.log(`\n=== VOTE CASTING SUMMARY ===`);
      console.log(`Total votes cast: ${voters.length}`);
      console.log(`Total gas used for voting: ${totalVotingGas.toString()}`);
      console.log(`Average gas per vote: ${(totalVotingGas / BigInt(voters.length)).toString()}`);
      
      // Find min and max gas usage
      const gasValues = votingGasResults.map(r => BigInt(r.actualGas));
      const minGas = gasValues.reduce((a, b) => a < b ? a : b);
      const maxGas = gasValues.reduce((a, b) => a > b ? a : b);
      console.log(`Minimum gas per vote: ${minGas.toString()}`);
      console.log(`Maximum gas per vote: ${maxGas.toString()}`);
      console.log(`Gas variance: ${(maxGas - minGas).toString()}`);
      
      // Get voting statistics
      const stats = await voting.getVotingStats();
      expect(stats[0]).to.equal(voters.length); // Total votes should equal number of voters
    });

    it('Should measure gas for vote verification operations', async function() {
      console.log('\n=== VOTE VERIFICATION GAS MEASUREMENTS ===');
      
      // Generate and update merkle root
      const voter1Vote = await voting.getVoterVote(voters[0].address);
      const leaf = await voting.generateVoteLeaf(
        voters[0].address, 
        voter1Vote.candidateId, 
        voter1Vote.timestamp
      );
      
      const tx = await voting.updateMerkleRoot(leaf);
      const receipt = await tx.wait();
      totalValidationGas += receipt.gasUsed;
      
      console.log(`Merkle root update gas: ${receipt.gasUsed.toString()}`);
      
      // Batch verify votes (view function)
      const isValid = await voting.batchVerifyVotes([], leaf);
      console.log(`Vote verification result: ${isValid}`);
      console.log('Note: batchVerifyVotes is a view function with minimal gas cost');
      
      console.log(`Total validation gas so far: ${totalValidationGas.toString()}`);
    });
  });

  describe('2. Rollup Operations Gas Analysis', function() {
    it('Should measure gas for constituency result submissions', async function() {
      console.log('\n=== ROLLUP OPERATIONS GAS MEASUREMENTS ===');
      
      // Submit constituency result 1
      const merkleRoot1 = ethers.keccak256(ethers.toUtf8Bytes('constituency1_10votes'));
      const candidateIds = [1, 2, 3, 4, 5];
      const candidateVotes1 = [3, 2, 2, 2, 1]; // Distribution of 10 votes
      
      console.log('Submitting constituency result 1...');
      const tx1 = await rollupBridge.connect(validators[0]).submitConstituencyResult(
        1, // constituency ID
        merkleRoot1,
        10, // total votes
        candidateIds,
        candidateVotes1
      );
      const receipt1 = await tx1.wait();
      totalRollupGas += receipt1.gasUsed;
      console.log(`Constituency 1 submission gas: ${receipt1.gasUsed.toString()}`);
      
      // Submit constituency result 2
      const merkleRoot2 = ethers.keccak256(ethers.toUtf8Bytes('constituency2_8votes'));
      const candidateVotes2 = [2, 2, 2, 1, 1]; // Distribution of 8 votes
      
      console.log('Submitting constituency result 2...');
      const tx2 = await rollupBridge.connect(validators[1]).submitConstituencyResult(
        2, // constituency ID
        merkleRoot2,
        8, // total votes
        candidateIds,
        candidateVotes2
      );
      const receipt2 = await tx2.wait();
      totalRollupGas += receipt2.gasUsed;
      console.log(`Constituency 2 submission gas: ${receipt2.gasUsed.toString()}`);
      
      console.log(`Total constituency submission gas: ${(receipt1.gasUsed + receipt2.gasUsed).toString()}`);
      console.log(`Average gas per constituency submission: ${((receipt1.gasUsed + receipt2.gasUsed) / 2n).toString()}`);
    });

    it('Should measure gas for result verification', async function() {
      console.log('\n=== VERIFICATION GAS MEASUREMENTS ===');
      
      // Verify constituency results
      const leaf1 = ethers.keccak256(ethers.toUtf8Bytes('proof1'));
      const tx1 = await rollupBridge.connect(validators[0]).verifyConstituencyResult(1, [], leaf1);
      const receipt1 = await tx1.wait();
      totalValidationGas += receipt1.gasUsed;
      console.log(`Constituency 1 verification gas: ${receipt1.gasUsed.toString()}`);
      
      const leaf2 = ethers.keccak256(ethers.toUtf8Bytes('proof2'));
      const tx2 = await rollupBridge.connect(validators[1]).verifyConstituencyResult(2, [], leaf2);
      const receipt2 = await tx2.wait();
      totalValidationGas += receipt2.gasUsed;
      console.log(`Constituency 2 verification gas: ${receipt2.gasUsed.toString()}`);
      
      console.log(`Total verification gas: ${(receipt1.gasUsed + receipt2.gasUsed).toString()}`);
    });

    it('Should measure gas for rollup batch creation', async function() {
      console.log('\n=== ROLLUP BATCH CREATION GAS MEASUREMENTS ===');
      
      // Force verify constituencies for testing
      await rollupBridge.forceVerifyConstituency(1);
      await rollupBridge.forceVerifyConstituency(2);
      
      // Increase time to allow rollup
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");
      
      // Create rollup batch
      const tx = await rollupBridge.connect(validators[0]).createRollupBatch([1, 2]);
      const receipt = await tx.wait();
      totalRollupGas += receipt.gasUsed;
      
      console.log(`Rollup batch creation gas: ${receipt.gasUsed.toString()}`);
      
      // Get batch information
      const batch = await rollupBridge.getRollupBatch(1);
      console.log(`Batch aggregated total votes: ${batch.totalVotes.toString()}`);
      console.log(`Constituencies in batch: ${batch.constituencyIds.length}`);
      
      // Sign the batch
      const signTx1 = await rollupBridge.connect(validators[0]).signRollupBatch(1);
      const signReceipt1 = await signTx1.wait();
      totalRollupGas += signReceipt1.gasUsed;
      
      const signTx2 = await rollupBridge.connect(validators[1]).signRollupBatch(1);
      const signReceipt2 = await signTx2.wait();
      totalRollupGas += signReceipt2.gasUsed;
      
      console.log(`Batch signature gas (Validator 1): ${signReceipt1.gasUsed.toString()}`);
      console.log(`Batch signature gas (Validator 2): ${signReceipt2.gasUsed.toString()}`);
      console.log(`Total batch operation gas: ${(receipt.gasUsed + signReceipt1.gasUsed + signReceipt2.gasUsed).toString()}`);
    });
  });

  describe('3. National Level Gas Analysis', function() {
    it('Should measure gas for division result submission to national', async function() {
      console.log('\n=== NATIONAL LEVEL GAS MEASUREMENTS ===');
      
      // Submit division results to national tally
      const aggregatedRoot1 = ethers.keccak256(ethers.toUtf8Bytes('division1_aggregated'));
      const candidateIds = [1, 2, 3, 4, 5];
      const divisionVotes1 = [50, 30, 25, 20, 15]; // Simulated division totals
      
      console.log('Submitting division 1 to national...');
      const tx1 = await nationalTally.connect(validators[0]).submitDivisionResult(
        1, // division ID
        aggregatedRoot1,
        140, // total votes
        candidateIds,
        divisionVotes1
      );
      const receipt1 = await tx1.wait();
      totalNationalGas += receipt1.gasUsed;
      console.log(`Division 1 national submission gas: ${receipt1.gasUsed.toString()}`);
      
      // Submit division 2
      const aggregatedRoot2 = ethers.keccak256(ethers.toUtf8Bytes('division2_aggregated'));
      const divisionVotes2 = [45, 35, 30, 25, 20];
      
      console.log('Submitting division 2 to national...');
      const tx2 = await nationalTally.connect(validators[0]).submitDivisionResult(
        2, // division ID
        aggregatedRoot2,
        155, // total votes
        candidateIds,
        divisionVotes2
      );
      const receipt2 = await tx2.wait();
      totalNationalGas += receipt2.gasUsed;
      console.log(`Division 2 national submission gas: ${receipt2.gasUsed.toString()}`);
      
      console.log(`Total national submission gas: ${(receipt1.gasUsed + receipt2.gasUsed).toString()}`);
    });

    it('Should measure gas for national verification operations', async function() {
      console.log('\n=== NATIONAL VERIFICATION GAS MEASUREMENTS ===');
      
      // Verify division results at national level
      const leaf1 = ethers.keccak256(ethers.toUtf8Bytes('national_proof_1'));
      const tx1 = await nationalTally.connect(owner).verifyDivisionResult(1, [], leaf1);
      const receipt1 = await tx1.wait();
      totalNationalGas += receipt1.gasUsed;
      console.log(`Division 1 national verification gas: ${receipt1.gasUsed.toString()}`);
      
      const leaf2 = ethers.keccak256(ethers.toUtf8Bytes('national_proof_2'));
      const tx2 = await nationalTally.connect(owner).verifyDivisionResult(2, [], leaf2);
      const receipt2 = await tx2.wait();
      totalNationalGas += receipt2.gasUsed;
      console.log(`Division 2 national verification gas: ${receipt2.gasUsed.toString()}`);
      
      totalValidationGas += receipt1.gasUsed + receipt2.gasUsed;
      console.log(`Total national verification gas: ${(receipt1.gasUsed + receipt2.gasUsed).toString()}`);
    });
  });

  describe('4. Comprehensive Gas Report', function() {
    it('Should provide detailed gas usage breakdown and projections', async function() {
      console.log('\n=== COMPREHENSIVE GAS USAGE REPORT ===');
      
      console.log(`\n--- Individual Operation Categories ---`);
      console.log(`Total Voting Gas (10 votes): ${totalVotingGas.toString()}`);
      console.log(`Total Validation Gas: ${totalValidationGas.toString()}`);
      console.log(`Total Rollup Gas: ${totalRollupGas.toString()}`);
      console.log(`Total National Gas: ${totalNationalGas.toString()}`);
      
      const grandTotal = totalVotingGas + totalValidationGas + totalRollupGas + totalNationalGas;
      console.log(`\nGrand Total Gas Used: ${grandTotal.toString()}`);
      
      console.log(`\n--- Per-Operation Averages ---`);
      console.log(`Average gas per vote: ${(totalVotingGas / 10n).toString()}`);
      console.log(`Average validation gas per operation: ${totalValidationGas > 0n ? (totalValidationGas / 6n).toString() : '0'}`);
      console.log(`Average rollup gas per batch: ${totalRollupGas > 0n ? totalRollupGas.toString() : '0'}`);
      console.log(`Average national gas per division: ${totalNationalGas > 0n ? (totalNationalGas / 4n).toString() : '0'}`);
      
      console.log(`\n--- Scaling Projections ---`);
      
      // Small scale (1,000 voters, 10 constituencies, 2 divisions)
      const smallScale = {
        voters: 1000,
        constituencies: 10,
        divisions: 2
      };
      
      const smallVotingGas = BigInt(smallScale.voters) * (totalVotingGas / 10n);
      const smallRollupGas = BigInt(smallScale.constituencies) * (totalRollupGas / 2n);
      const smallNationalGas = BigInt(smallScale.divisions) * (totalNationalGas / 2n);
      const smallTotal = smallVotingGas + smallRollupGas + smallNationalGas;
      
      console.log(`\nSmall Scale (${smallScale.voters} voters, ${smallScale.constituencies} constituencies, ${smallScale.divisions} divisions):`);
      console.log(`  Voting gas: ${smallVotingGas.toString()}`);
      console.log(`  Rollup gas: ${smallRollupGas.toString()}`);
      console.log(`  National gas: ${smallNationalGas.toString()}`);
      console.log(`  Total gas: ${smallTotal.toString()}`);
      
      // Large scale (1M voters, 650 constituencies, 12 divisions) - UK General Election scale
      const largeScale = {
        voters: 1000000,
        constituencies: 650,
        divisions: 12
      };
      
      const largeVotingGas = BigInt(largeScale.voters) * (totalVotingGas / 10n);
      const largeRollupGas = BigInt(largeScale.constituencies) * (totalRollupGas / 2n);
      const largeNationalGas = BigInt(largeScale.divisions) * (totalNationalGas / 2n);
      const largeTotal = largeVotingGas + largeRollupGas + largeNationalGas;
      
      console.log(`\nLarge Scale (${largeScale.voters} voters, ${largeScale.constituencies} constituencies, ${largeScale.divisions} divisions):`);
      console.log(`  Voting gas: ${largeVotingGas.toString()}`);
      console.log(`  Rollup gas: ${largeRollupGas.toString()}`);
      console.log(`  National gas: ${largeNationalGas.toString()}`);
      console.log(`  Total gas: ${largeTotal.toString()}`);
      
      console.log(`\n--- Cost Estimates (ETH) ---`);
      
      // Gas price scenarios (in gwei)
      const gasPrices = [10n, 20n, 50n, 100n];
      
      console.log(`\nCost estimates for Large Scale election:`);
      for (const gasPrice of gasPrices) {
        const costWei = largeTotal * gasPrice * 1000000000n; // Convert gwei to wei
        const costEth = Number(costWei) / 1e18; // Convert to ETH
        console.log(`  At ${gasPrice} gwei: ${costEth.toFixed(2)} ETH`);
      }
      
      console.log(`\n--- Performance Metrics ---`);
      console.log(`Gas efficiency per vote: ${(totalVotingGas / 10n).toString()} gas`);
      console.log(`Rollup efficiency: ${totalRollupGas > 0n ? (18n * 1000000n / totalRollupGas).toString() : '0'} votes per million gas`);
      console.log(`Overall system efficiency: ${grandTotal > 0n ? (10n * 1000000n / grandTotal).toString() : '0'} votes per million gas`);
      
      // Get final stats from contracts
      const energyStats = await nationalTally.getEnergyStats();
      console.log(`\n--- Contract-Tracked Statistics ---`);
      console.log(`National contract gas tracking: ${energyStats[0].toString()}`);
      console.log(`National contract transactions: ${energyStats[1].toString()}`);
      
      // Final validation
      expect(grandTotal).to.be.greaterThan(0);
      console.log(`\n=== GAS MEASUREMENT REPORT COMPLETE ===`);
    });
  });
});
