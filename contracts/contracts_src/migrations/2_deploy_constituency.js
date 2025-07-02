const ConstituencyToken = artifacts.require("ConstituencyToken");
const Voting = artifacts.require("Voting");

module.exports = async function (deployer, network, accounts) {
  const [owner, validator1, validator2, ...voters] = accounts;
  
  console.log(`Deploying to network: ${network}`);
  console.log(`Owner address: ${owner}`);
  
  // Deploy ConstituencyToken
  const tokenName = "ConstituencyToken";
  const tokenSymbol = "CONST";
  const initialSupply = web3.utils.toWei("100000", "ether"); // 100,000 tokens
  
  await deployer.deploy(
    ConstituencyToken,
    tokenName,
    tokenSymbol,
    initialSupply,
    { from: owner }
  );
  
  const constituencyToken = await ConstituencyToken.deployed();
  console.log(`ConstituencyToken deployed at: ${constituencyToken.address}`);
  
  // Deploy Voting contract
  await deployer.deploy(
    Voting,
    constituencyToken.address,
    { from: owner }
  );
  
  const voting = await Voting.deployed();
  console.log(`Voting contract deployed at: ${voting.address}`);
  
  // Initial setup for development/testing
  if (network === "development" || network === "ganache") {
    console.log("Setting up development environment...");
    
    // Distribute tokens to validators and voters
    const tokenAmount = web3.utils.toWei("1000", "ether"); // 1000 tokens each
    const voterAmount = web3.utils.toWei("10", "ether"); // 10 tokens each for voting eligibility
    
    // Send tokens to validators
    await constituencyToken.transfer(validator1, tokenAmount, { from: owner });
    await constituencyToken.transfer(validator2, tokenAmount, { from: owner });
    console.log(`Tokens distributed to validators`);
    
    // Send tokens to first 5 voters for testing
    for (let i = 0; i < Math.min(5, voters.length); i++) {
      await constituencyToken.transfer(voters[i], voterAmount, { from: owner });
    }
    console.log(`Tokens distributed to ${Math.min(5, voters.length)} voters`);
    
    // Register validators
    await constituencyToken.registerValidator({ from: validator1 });
    await constituencyToken.registerValidator({ from: validator2 });
    console.log("Validators registered");
    
    // Add sample candidates
    await voting.addCandidate("Alice Johnson", "Progressive Party", { from: owner });
    await voting.addCandidate("Bob Smith", "Conservative Party", { from: owner });
    await voting.addCandidate("Carol Davis", "Green Party", { from: owner });
    console.log("Sample candidates added");
    
    // Start voting for 24 hours (for testing, use shorter duration)
    const votingDuration = network === "development" ? 3600 : 86400; // 1 hour for dev, 24 hours for others
    await voting.startVoting(votingDuration, { from: owner });
    console.log(`Voting started for ${votingDuration} seconds`);
  }
  
  // Save deployment info
  const deploymentInfo = {
    network: network,
    timestamp: new Date().toISOString(),
    contracts: {
      ConstituencyToken: {
        address: constituencyToken.address,
        name: tokenName,
        symbol: tokenSymbol,
        initialSupply: initialSupply
      },
      Voting: {
        address: voting.address,
        tokenAddress: constituencyToken.address
      }
    },
    accounts: {
      owner: owner,
      validators: [validator1, validator2],
      voters: voters.slice(0, 5)
    }
  };
  
  console.log("\n=== Constituency Deployment Complete ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));
};