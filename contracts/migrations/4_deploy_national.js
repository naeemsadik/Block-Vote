const NationalTally = artifacts.require("NationalTally");

module.exports = async function (deployer, network, accounts) {
  const [owner, nationalValidator1, nationalValidator2, nationalValidator3, divisionValidator1, divisionValidator2, ...others] = accounts;
  
  console.log(`Deploying National tier to network: ${network}`);
  console.log(`Owner address: ${owner}`);
  
  // Expected number of divisions (configurable based on election scale)
  const expectedDivisions = network === "development" ? 3 : 10;
  
  // Deploy NationalTally
  await deployer.deploy(NationalTally, expectedDivisions, { from: owner });
  
  const nationalTally = await NationalTally.deployed();
  console.log(`NationalTally deployed at: ${nationalTally.address}`);
  console.log(`Expected divisions: ${expectedDivisions}`);
  
  // Initial setup for development/testing
  if (network === "development" || network === "national") {
    console.log("Setting up national tier environment...");
    
    // Authorize national validators
    await nationalTally.authorizeNationalValidator(nationalValidator1, { from: owner });
    await nationalTally.authorizeNationalValidator(nationalValidator2, { from: owner });
    await nationalTally.authorizeNationalValidator(nationalValidator3, { from: owner });
    console.log("National validators authorized");
    
    // Authorize division validators
    await nationalTally.authorizeDivisionValidator(divisionValidator1, { from: owner });
    await nationalTally.authorizeDivisionValidator(divisionValidator2, { from: owner });
    console.log("Division validators authorized");
    
    // Set required signatures for national operations (2 out of 3)
    await nationalTally.setRequiredNationalSignatures(2, { from: owner });
    console.log("Required national signatures set to 2");
    
    // Add sample candidates for national election
    await nationalTally.addCandidate("Alice Johnson", "Progressive Party", { from: owner });
    await nationalTally.addCandidate("Bob Smith", "Conservative Party", { from: owner });
    await nationalTally.addCandidate("Carol Davis", "Green Party", { from: owner });
    await nationalTally.addCandidate("David Wilson", "Liberal Party", { from: owner });
    await nationalTally.addCandidate("Eva Martinez", "Socialist Party", { from: owner });
    console.log("Sample national candidates added");
    
    // Get initial national results (should be empty)
    const initialResults = await nationalTally.getNationalResults();
    console.log(`Initial national results:`, {
      totalVotes: initialResults.totalVotes.toString(),
      totalDivisions: initialResults.totalDivisions.toString(),
      finalized: initialResults.finalized
    });
  }
  
  // Save deployment info
  const deploymentInfo = {
    network: network,
    timestamp: new Date().toISOString(),
    contracts: {
      NationalTally: {
        address: nationalTally.address,
        expectedDivisions: expectedDivisions,
        requiredNationalSignatures: 2
      }
    },
    validators: {
      national: {
        validator1: nationalValidator1,
        validator2: nationalValidator2,
        validator3: nationalValidator3
      },
      division: {
        validator1: divisionValidator1,
        validator2: divisionValidator2
      }
    },
    candidates: [
      { id: 1, name: "Alice Johnson", party: "Progressive Party" },
      { id: 2, name: "Bob Smith", party: "Conservative Party" },
      { id: 3, name: "Carol Davis", party: "Green Party" },
      { id: 4, name: "David Wilson", party: "Liberal Party" },
      { id: 5, name: "Eva Martinez", party: "Socialist Party" }
    ]
  };
  
  console.log("\n=== National Deployment Complete ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  // Create deployment summary file
  const fs = require('fs');
  const path = require('path');
  
  try {
    const deploymentDir = path.join(__dirname, '../../deployment');
    if (!fs.existsSync(deploymentDir)) {
      fs.mkdirSync(deploymentDir, { recursive: true });
    }
    
    const deploymentFile = path.join(deploymentDir, `${network}_deployment.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`Deployment info saved to: ${deploymentFile}`);
  } catch (error) {
    console.log("Could not save deployment file:", error.message);
  }
};