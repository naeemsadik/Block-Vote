const { ethers } = require("hardhat");

async function main() {
  console.log("=== Detailed Gas Measurement Tool ===\n");
  
  // Get signers
  const [owner, ...voters] = await ethers.getSigners();
  
  // Deploy contracts
  console.log("Deploying contracts...");
  
  const ConstituencyToken = await ethers.getContractFactory("ConstituencyToken");
  const constituencyToken = await ConstituencyToken.deploy(
    "VoteToken", 
    "VOTE", 
    ethers.parseEther("500000")
  );
  await constituencyToken.deploymentTransaction().wait();
  
  const Voting = await ethers.getContractFactory("Voting");
  const voting = await Voting.deploy(await constituencyToken.getAddress());
  await voting.deploymentTransaction().wait();
  
  const RollupBridge = await ethers.getContractFactory("RollupBridge");
  const rollupBridge = await RollupBridge.deploy();
  await rollupBridge.deploymentTransaction().wait();
  
  const NationalTally = await ethers.getContractFactory("NationalTally");
  const nationalTally = await NationalTally.deploy(2);
  await nationalTally.deploymentTransaction().wait();

  const candidateNames = ["Alice Johnson", "Bob Smith", "Carol Davis"];
  console.log("Adding candidates...");
  for (const name of candidateNames) {
    await voting.addCandidate(name, "Party");
    await nationalTally.addCandidate(name, "Party");
  }
  
  console.log("Starting voting...");
  await voting.startVoting(86400);

  console.log("Minting tokens to voters...");
  for (let i = 0; i < 10; i++) {
    await constituencyToken.mint(voters[i].address, ethers.parseEther("50"));
  }

  console.log("Casting votes...");
  let totalGasUsed = 0n;
  for (let i = 0; i < 10; i++) {
    const tx = await voting.connect(voters[i]).castVote((i % 3) + 1); // Random vote for one of 3 candidates
    const receipt = await tx.wait();
    console.log(`Vote ${i + 1} gas used: ${receipt.gasUsed.toString()}`);
    totalGasUsed += receipt.gasUsed;
  }

  console.log("Total gas used for 10 votes: ", totalGasUsed.toString());
  console.log(`Average gas per vote: ${(totalGasUsed / 10n).toString()}`);

  const merkleRoot = ethers.keccak256(ethers.toUtf8Bytes('constituency_votes'));
  const candidateIds = [1, 2, 3];
  const candidateVotes = [5, 3, 2]; // Just an example

  console.log("Submitting constituency result...");
  let rollupGasUsed = 0n;
  const rollupTx = await rollupBridge.connect(owner).submitConstituencyResult(
    1, // constituency ID
    merkleRoot,
    10, // total votes
    candidateIds,
    candidateVotes
  );
  const rollupReceipt = await rollupTx.wait();
  console.log(`Constituency result submission gas used: ${rollupReceipt.gasUsed.toString()}`);
  rollupGasUsed += rollupReceipt.gasUsed;

  // Advance time to open rollup window (default is 3600 seconds = 1 hour)
  console.log("Advancing time to open rollup window...");
  await ethers.provider.send("evm_increaseTime", [3600]); // Advance 1 hour
  await ethers.provider.send("evm_mine"); // Mine a new block

// Force verify the constituency result for testing
  console.log("Force verifying constituency result...");
  await rollupBridge.forceVerifyConstituency(1);

  const rollupBatchTx = await rollupBridge.createRollupBatch([1]);
  const rollupBatchReceipt = await rollupBatchTx.wait();
  console.log(`Rollup batch creation gas used: ${rollupBatchReceipt.gasUsed.toString()}`);
  rollupGasUsed += rollupBatchReceipt.gasUsed;

  console.log("Rollup operation total gas used: ", rollupGasUsed.toString());
  console.log("Overall total gas used: ", (totalGasUsed + rollupGasUsed).toString());

  console.log("\n=== Detailed Gas Report Complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
