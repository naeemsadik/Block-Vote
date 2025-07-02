const { ethers } = require("hardhat");

async function main() {
  console.log("=== Interactive Gas Measurement Tool ===\n");
  
  // Get signers
  const [owner, voter1, voter2] = await ethers.getSigners();
  
  // Deploy contracts
  console.log("Deploying contracts...");
  
  const ConstituencyToken = await ethers.getContractFactory("ConstituencyToken");
  const constituencyToken = await ConstituencyToken.deploy(
    "VoteToken", 
    "VOTE", 
    ethers.parseEther("500000")
  );
  console.log(`ConstituencyToken deployed with gas: ${(await constituencyToken.deploymentTransaction().wait()).gasUsed}`);
  
  const Voting = await ethers.getContractFactory("Voting");
  const voting = await Voting.deploy(await constituencyToken.getAddress());
  console.log(`Voting deployed with gas: ${(await voting.deploymentTransaction().wait()).gasUsed}`);
  
  // Measure individual operations
  console.log("\n=== Measuring Individual Operations ===");
  
  // 1. Add candidate
  console.log("1. Adding candidate...");
  const addCandidateTx = await voting.addCandidate("Alice Johnson", "Progressive Party");
  const addCandidateReceipt = await addCandidateTx.wait();
  console.log(`   Gas used: ${addCandidateReceipt.gasUsed}`);
  
  // 2. Start voting
  console.log("2. Starting voting...");
  const startVotingTx = await voting.startVoting(86400);
  const startVotingReceipt = await startVotingTx.wait();
  console.log(`   Gas used: ${startVotingReceipt.gasUsed}`);
  
  // 3. Mint tokens to voter
  console.log("3. Minting tokens...");
  const mintTx = await constituencyToken.mint(voter1.address, ethers.parseEther("50"));
  const mintReceipt = await mintTx.wait();
  console.log(`   Gas used: ${mintReceipt.gasUsed}`);
  
  // 4. Cast vote
  console.log("4. Casting vote...");
  const castVoteTx = await voting.connect(voter1).castVote(1);
  const castVoteReceipt = await castVoteTx.wait();
  console.log(`   Gas used: ${castVoteReceipt.gasUsed}`);
  
  // 5. Gas estimation vs actual
  console.log("\n=== Gas Estimation vs Actual ===");
  await constituencyToken.mint(voter2.address, ethers.parseEther("50"));
  
  const estimatedGas = await voting.connect(voter2).castVote.estimateGas(1);
  console.log(`Estimated gas for second vote: ${estimatedGas}`);
  
  const actualTx = await voting.connect(voter2).castVote(1);
  const actualReceipt = await actualTx.wait();
  console.log(`Actual gas for second vote: ${actualReceipt.gasUsed}`);
  console.log(`Difference: ${actualReceipt.gasUsed - estimatedGas}`);
  
  console.log("\n=== Summary ===");
  console.log("You can run this script with: npx hardhat run scripts/gas_measurement.js");
  console.log("Modify the script to test different operations and scenarios.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
