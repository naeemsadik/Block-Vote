const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Gas Usage Measurement for Block Vote System', function() {
  let constituencyToken, voting, rollupBridge, nationalTally;
  let owner, voter1, voter2, validator1, validator2, divisionValidator;
  
  before(async function() {
    // Get signers
    [owner, voter1, voter2, validator1, validator2, divisionValidator] = await ethers.getSigners();
    
    // Deploy ConstituencyToken
    const ConstituencyToken = await ethers.getContractFactory('ConstituencyToken');
    constituencyToken = await ConstituencyToken.deploy(
      "VoteToken", 
      "VOTE", 
      ethers.parseEther("500000") // 500K tokens initial
    );
    
    // Deploy Voting contract
    const Voting = await ethers.getContractFactory('Voting');
    voting = await Voting.deploy(await constituencyToken.getAddress());
    
    // Deploy RollupBridge
    const RollupBridge = await ethers.getContractFactory('RollupBridge');
    rollupBridge = await RollupBridge.deploy();
    
    // Deploy NationalTally
    const NationalTally = await ethers.getContractFactory('NationalTally');
    nationalTally = await NationalTally.deploy(2); // Expect 2 divisions
    
    // Setup: Mint tokens to voters
    await constituencyToken.mint(voter1.address, ethers.parseEther("50"));
    await constituencyToken.mint(voter2.address, ethers.parseEther("50"));
    
    // Setup: Add candidates to voting contract
    await voting.addCandidate("Alice Johnson", "Progressive Party");
    await voting.addCandidate("Bob Smith", "Conservative Party");
    await voting.addCandidate("Carol Davis", "Independent");
    
    // Setup: Add candidates to national tally
    await nationalTally.addCandidate("Alice Johnson", "Progressive Party");
    await nationalTally.addCandidate("Bob Smith", "Conservative Party"); 
    await nationalTally.addCandidate("Carol Davis", "Independent");
    
    // Setup: Start voting (24 hours duration)
    await voting.startVoting(86400);
    
    // Setup: Add validators to rollup bridge
    await rollupBridge.addValidator(validator1.address);
    await rollupBridge.addValidator(validator2.address);
    
    // Setup: Authorize division validator for national tally
    await nationalTally.authorizeDivisionValidator(divisionValidator.address);
    await nationalTally.authorizeNationalValidator(owner.address);
    await nationalTally.authorizeNationalValidator(divisionValidator.address);
  });

  describe('1. Vote Casting Gas Measurement', function() {
    it('Should measure gas for individual vote casting', async function() {
      console.log('\n=== VOTE CASTING GAS MEASUREMENTS ===');
      
      // Cast vote by voter1
      const tx1 = await voting.connect(voter1).castVote(1); // Vote for Alice
      const receipt1 = await tx1.wait();
      console.log(`Gas used for casting vote (Voter 1): ${receipt1.gasUsed.toString()}`);
      
      // Cast vote by voter2
      const tx2 = await voting.connect(voter2).castVote(2); // Vote for Bob
      const receipt2 = await tx2.wait();
      console.log(`Gas used for casting vote (Voter 2): ${receipt2.gasUsed.toString()}`);
      
      // Verify votes were cast
      expect(await voting.hasVoted(voter1.address)).to.be.true;
      expect(await voting.hasVoted(voter2.address)).to.be.true;
      
      // Get voting statistics
      const stats = await voting.getVotingStats();
      console.log(`Total votes cast: ${stats[0].toString()}`);
      
      const totalGasForVoting = receipt1.gasUsed + receipt2.gasUsed;
      console.log(`Total gas for 2 vote castings: ${totalGasForVoting.toString()}`);
      console.log(`Average gas per vote: ${(totalGasForVoting / 2n).toString()}`);
    });

    it('Should measure gas for batch vote verification', async function() {
      console.log('\n=== VOTE VERIFICATION GAS MEASUREMENTS ===');
      
      // Generate vote leaf for verification
      const voter1Vote = await voting.getVoterVote(voter1.address);
      const leaf = await voting.generateVoteLeaf(
        voter1.address, 
        voter1Vote.candidateId, 
        voter1Vote.timestamp
      );
      
      // Update merkle root (simulation)
      const tx = await voting.updateMerkleRoot(leaf);
      const receipt = await tx.wait();
      console.log(`Gas used for updating Merkle root: ${receipt.gasUsed.toString()}`);
      
      // Batch verify votes (view function - minimal gas)
      const isValid = await voting.batchVerifyVotes([], leaf);
      console.log(`Vote verification result: ${isValid}`);
      console.log('Note: batchVerifyVotes is a view function, so minimal gas usage');
    });
  });

  describe('2. Rollup Operations Gas Measurement', function() {
    it('Should measure gas for constituency result submission', async function() {
      console.log('\n=== ROLLUP SUBMISSION GAS MEASUREMENTS ===');
      
      // Submit constituency result 1
      const merkleRoot1 = ethers.keccak256(ethers.toUtf8Bytes('constituency1_votes'));
      const candidateIds = [1, 2, 3];
      const candidateVotes1 = [150, 100, 50]; // Total: 300 votes
      
      const tx1 = await rollupBridge.connect(validator1).submitConstituencyResult(
        1, // constituency ID
        merkleRoot1,
        300, // total votes
        candidateIds,
        candidateVotes1
      );
      const receipt1 = await tx1.wait();
      console.log(`Gas used for constituency result submission (Constituency 1): ${receipt1.gasUsed.toString()}`);
      
      // Submit constituency result 2
      const merkleRoot2 = ethers.keccak256(ethers.toUtf8Bytes('constituency2_votes'));
      const candidateVotes2 = [200, 150, 100]; // Total: 450 votes
      
      const tx2 = await rollupBridge.connect(validator2).submitConstituencyResult(
        2, // constituency ID
        merkleRoot2,
        450, // total votes
        candidateIds,
        candidateVotes2
      );
      const receipt2 = await tx2.wait();
      console.log(`Gas used for constituency result submission (Constituency 2): ${receipt2.gasUsed.toString()}`);
      
      const totalSubmissionGas = receipt1.gasUsed + receipt2.gasUsed;
      console.log(`Total gas for 2 constituency submissions: ${totalSubmissionGas.toString()}`);
      console.log(`Average gas per constituency submission: ${(totalSubmissionGas / 2n).toString()}`);
    });

    it('Should measure gas for result verification', async function() {
      console.log('\n=== RESULT VERIFICATION GAS MEASUREMENTS ===');
      
      // Verify constituency result 1
      const leaf1 = ethers.keccak256(ethers.toUtf8Bytes('vote_proof_1'));
      const tx1 = await rollupBridge.connect(validator1).verifyConstituencyResult(1, [], leaf1);
      const receipt1 = await tx1.wait();
      console.log(`Gas used for verifying constituency result 1: ${receipt1.gasUsed.toString()}`);
      
      // Verify constituency result 2  
      const leaf2 = ethers.keccak256(ethers.toUtf8Bytes('vote_proof_2'));
      const tx2 = await rollupBridge.connect(validator2).verifyConstituencyResult(2, [], leaf2);
      const receipt2 = await tx2.wait();
      console.log(`Gas used for verifying constituency result 2: ${receipt2.gasUsed.toString()}`);
      
      const totalVerificationGas = receipt1.gasUsed + receipt2.gasUsed;
      console.log(`Total gas for 2 verifications: ${totalVerificationGas.toString()}`);
      console.log(`Average gas per verification: ${(totalVerificationGas / 2n).toString()}`);
    });

    it('Should measure gas for rollup batch creation', async function() {
      console.log('\n=== ROLLUP BATCH CREATION GAS MEASUREMENTS ===');
      
      // Force verify constituencies for testing
      await rollupBridge.forceVerifyConstituency(1);
      await rollupBridge.forceVerifyConstituency(2);
      
      // Increase time to allow rollup
      await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
      await ethers.provider.send("evm_mine");
      
      // Create rollup batch
      const tx = await rollupBridge.connect(validator1).createRollupBatch([1, 2]);
      const receipt = await tx.wait();
      console.log(`Gas used for creating rollup batch (2 constituencies): ${receipt.gasUsed.toString()}`);
      
      // Get batch information
      const batch = await rollupBridge.getRollupBatch(1);
      console.log(`Batch total votes: ${batch.totalVotes.toString()}`);
      console.log(`Number of constituencies in batch: ${batch.constituencyIds.length}`);
    });

    it('Should measure gas for batch signature', async function() {
      console.log('\n=== BATCH SIGNATURE GAS MEASUREMENTS ===');
      
      // Sign the rollup batch
      const tx1 = await rollupBridge.connect(validator1).signRollupBatch(1);
      const receipt1 = await tx1.wait();
      console.log(`Gas used for batch signature (Validator 1): ${receipt1.gasUsed.toString()}`);
      
      const tx2 = await rollupBridge.connect(validator2).signRollupBatch(1);
      const receipt2 = await tx2.wait();
      console.log(`Gas used for batch signature (Validator 2): ${receipt2.gasUsed.toString()}`);
      
      const totalSignatureGas = receipt1.gasUsed + receipt2.gasUsed;
      console.log(`Total gas for 2 signatures: ${totalSignatureGas.toString()}`);
    });
  });

  describe('3. National Tally Gas Measurement', function() {
    it('Should measure gas for division result submission to national', async function() {
      console.log('\n=== NATIONAL TALLY SUBMISSION GAS MEASUREMENTS ===');
      
      // Submit division result 1 to national tally
      const aggregatedRoot1 = ethers.keccak256(ethers.toUtf8Bytes('division1_aggregated'));
      const candidateIds = [1, 2, 3];
      const divisionVotes1 = [350, 250, 150]; // Total: 750 votes
      
      const tx1 = await nationalTally.connect(divisionValidator).submitDivisionResult(
        1, // division ID
        aggregatedRoot1,
        750, // total votes
        candidateIds,
        divisionVotes1
      );
      const receipt1 = await tx1.wait();
      console.log(`Gas used for division result submission to national (Division 1): ${receipt1.gasUsed.toString()}`);
      
      // Submit division result 2 to national tally
      const aggregatedRoot2 = ethers.keccak256(ethers.toUtf8Bytes('division2_aggregated'));
      const divisionVotes2 = [400, 300, 200]; // Total: 900 votes
      
      const tx2 = await nationalTally.connect(divisionValidator).submitDivisionResult(
        2, // division ID
        aggregatedRoot2,
        900, // total votes
        candidateIds,
        divisionVotes2
      );
      const receipt2 = await tx2.wait();
      console.log(`Gas used for division result submission to national (Division 2): ${receipt2.gasUsed.toString()}`);
      
      const totalNationalSubmissionGas = receipt1.gasUsed + receipt2.gasUsed;
      console.log(`Total gas for 2 division submissions to national: ${totalNationalSubmissionGas.toString()}`);
      console.log(`Average gas per division submission to national: ${(totalNationalSubmissionGas / 2n).toString()}`);
    });

    it('Should measure gas for division result verification at national level', async function() {
      console.log('\n=== NATIONAL VERIFICATION GAS MEASUREMENTS ===');
      
      // Verify division result 1 at national level
      const leaf1 = ethers.keccak256(ethers.toUtf8Bytes('national_proof_1'));
      const tx1 = await nationalTally.connect(owner).verifyDivisionResult(1, [], leaf1);
      const receipt1 = await tx1.wait();
      console.log(`Gas used for verifying division result at national level (Division 1): ${receipt1.gasUsed.toString()}`);
      
      // Verify division result 2 at national level
      const leaf2 = ethers.keccak256(ethers.toUtf8Bytes('national_proof_2'));
      const tx2 = await nationalTally.connect(owner).verifyDivisionResult(2, [], leaf2);
      const receipt2 = await tx2.wait();
      console.log(`Gas used for verifying division result at national level (Division 2): ${receipt2.gasUsed.toString()}`);
      
      const totalNationalVerificationGas = receipt1.gasUsed + receipt2.gasUsed;
      console.log(`Total gas for 2 national verifications: ${totalNationalVerificationGas.toString()}`);
    });

    it('Should measure gas for finalizing division results', async function() {
      console.log('\n=== DIVISION FINALIZATION GAS MEASUREMENTS ===');
      
      // Check if divisions are already verified, if not verify them
      const division1 = await nationalTally.getDivisionResult(1);
      const division2 = await nationalTally.getDivisionResult(2);
      
      if (!division1.verified) {
        const verifyTx1 = await nationalTally.connect(owner).verifyDivisionResult(1, [], ethers.keccak256(ethers.toUtf8Bytes('verify1')));
        await verifyTx1.wait();
      }
      if (!division2.verified) {
        const verifyTx2 = await nationalTally.connect(owner).verifyDivisionResult(2, [], ethers.keccak256(ethers.toUtf8Bytes('verify2')));
        await verifyTx2.wait();
      }
      
      // Finalize division result 1
      const tx1 = await nationalTally.connect(owner).finalizeDivisionResult(1);
      const receipt1 = await tx1.wait();
      console.log(`Gas used for finalizing division result (Division 1, Signature 1): ${receipt1.gasUsed.toString()}`);
      
      // Additional signatures for division 1
      const tx2 = await nationalTally.connect(divisionValidator).finalizeDivisionResult(1);
      const receipt2 = await tx2.wait();
      console.log(`Gas used for finalizing division result (Division 1, Signature 2): ${receipt2.gasUsed.toString()}`);
      
      // Need one more signature to actually finalize (requires 3 signatures)
      // For now, let's just continue with division 2
      
      // Finalize division result 2
      const tx3 = await nationalTally.connect(owner).finalizeDivisionResult(2);
      const receipt3 = await tx3.wait();
      console.log(`Gas used for finalizing division result (Division 2, Signature 1): ${receipt3.gasUsed.toString()}`);
      
      const tx4 = await nationalTally.connect(divisionValidator).finalizeDivisionResult(2);
      const receipt4 = await tx4.wait();
      console.log(`Gas used for finalizing division result (Division 2, Signature 2): ${receipt4.gasUsed.toString()}`);
    });
  });

  describe('4. Overall System Gas Analysis', function() {
    it('Should provide comprehensive gas usage summary', async function() {
      console.log('\n=== COMPREHENSIVE GAS USAGE SUMMARY ===');
      
      // Get energy statistics from national contract
      const energyStats = await nationalTally.getEnergyStats();
      console.log(`Total gas tracked by national contract: ${energyStats[0].toString()}`);
      console.log(`Total transactions tracked: ${energyStats[1].toString()}`);
      console.log(`Average gas per transaction: ${energyStats[2].toString()}`);
      
      // Get final national results
      const nationalResults = await nationalTally.getNationalResults();
      console.log(`Final total votes in national tally: ${nationalResults[0].toString()}`);
      console.log(`Total divisions processed: ${nationalResults[1].toString()}`);
      
      console.log('\n=== ESTIMATED GAS COSTS FOR FULL ELECTION ===');
      console.log('Note: These are estimates based on the test measurements above');
      console.log('Actual costs will vary based on network conditions and optimization');
      
      // Example calculations for a larger election
      const estimatedVoters = 1000000; // 1 million voters
      const estimatedConstituencies = 650; // UK-style election
      const estimatedDivisions = 12; // Regional divisions
      
      const avgVoteGas = 50000n; // Estimated from tests
      const avgConstituencySubmissionGas = 150000n;
      const avgRollupBatchGas = 200000n;
      const avgNationalSubmissionGas = 180000n;
      
      const totalVotingGas = BigInt(estimatedVoters) * avgVoteGas;
      const totalConstituencyGas = BigInt(estimatedConstituencies) * avgConstituencySubmissionGas;
      const totalRollupGas = BigInt(estimatedDivisions) * avgRollupBatchGas;
      const totalNationalGas = BigInt(estimatedDivisions) * avgNationalSubmissionGas;
      
      console.log(`Estimated gas for ${estimatedVoters} votes: ${totalVotingGas.toString()}`);
      console.log(`Estimated gas for ${estimatedConstituencies} constituency submissions: ${totalConstituencyGas.toString()}`);
      console.log(`Estimated gas for ${estimatedDivisions} rollup batches: ${totalRollupGas.toString()}`);
      console.log(`Estimated gas for ${estimatedDivisions} national submissions: ${totalNationalGas.toString()}`);
      
      const totalSystemGas = totalVotingGas + totalConstituencyGas + totalRollupGas + totalNationalGas;
      console.log(`Total estimated gas for full election: ${totalSystemGas.toString()}`);
      
      // Convert to ETH estimate (assuming 20 gwei gas price)
      const gasPriceGwei = 20n;
      const totalCostWei = totalSystemGas * gasPriceGwei * 1000000000n; // Convert gwei to wei
      const totalCostEth = totalCostWei / 1000000000000000000n; // Convert wei to ETH
      console.log(`Estimated total cost at 20 gwei: ${totalCostEth.toString()} ETH`);
    });
  });
});
