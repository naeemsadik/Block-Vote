const RollupBridge = artifacts.require("RollupBridge");

module.exports = async function (deployer, network, accounts) {
  const [owner, validator1, validator2, validator3, ...others] = accounts;
  
  console.log(`Deploying Division tier to network: ${network}`);
  console.log(`Owner address: ${owner}`);
  
  // Deploy RollupBridge
  await deployer.deploy(RollupBridge, { from: owner });
  
  const rollupBridge = await RollupBridge.deployed();
  console.log(`RollupBridge deployed at: ${rollupBridge.address}`);
  
  // Initial setup for development/testing
  if (network === "development" || network === "division") {
    console.log("Setting up division tier environment...");
    
    // Add validators to the division tier
    await rollupBridge.addValidator(validator1, { from: owner });
    await rollupBridge.addValidator(validator2, { from: owner });
    await rollupBridge.addValidator(validator3, { from: owner });
    console.log("Division validators added");
    
    // Set rollup interval to 1 hour for testing
    const rollupInterval = 3600; // 1 hour
    await rollupBridge.setRollupInterval(rollupInterval, { from: owner });
    console.log(`Rollup interval set to ${rollupInterval} seconds`);
    
    // Set required signatures for multi-sig (2 out of 3)
    await rollupBridge.setRequiredSignatures(2, { from: owner });
    console.log("Required signatures set to 2");
    
    // Get active validators
    const activeValidators = await rollupBridge.getActiveValidators();
    console.log(`Active validators: ${activeValidators}`);
  }
  
  // Save deployment info
  const deploymentInfo = {
    network: network,
    timestamp: new Date().toISOString(),
    contracts: {
      RollupBridge: {
        address: rollupBridge.address,
        rollupInterval: 3600,
        requiredSignatures: 2
      }
    },
    validators: {
      validator1: validator1,
      validator2: validator2,
      validator3: validator3
    }
  };
  
  console.log("\n=== Division Deployment Complete ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));
};