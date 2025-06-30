const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('RollupBridge Contract Tests', function() {
  let RollupBridge, rollupBridge, owner, validator;
  
  before(async function() {
    [owner, validator] = await ethers.getSigners();
    RollupBridge = await ethers.getContractFactory('RollupBridge');
    rollupBridge = await RollupBridge.deploy();
    await rollupBridge.deployed();
  });

  it('Should submit and verify vote batches', async function() {
    const voteHashes = [
      ethers.utils.formatBytes32String('vote1'),
      ethers.utils.formatBytes32String('vote2'),
      ethers.utils.formatBytes32String('vote3'),
      ethers.utils.formatBytes32String('vote4'),
      ethers.utils.formatBytes32String('vote5')
    ];
    
    const tx = await rollupBridge.submitBatch(voteHashes, 1);
    const receipt = await tx.wait();
    
    console.log('Gas used for batch submission:', receipt.gasUsed.toString());
    
    const isVerified = await rollupBridge.verifyBatch(1);
    expect(isVerified).to.be.true;
  });
});