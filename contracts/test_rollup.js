const { expect } = require('chai');
const hre = require('hardhat');
const { ethers } = hre;

describe('RollupBridge Contract Tests', function() {
  let RollupBridge, rollupBridge, owner, user;

  before(async function() {
    [owner, user] = await ethers.getSigners();
    RollupBridge = await ethers.getContractFactory('RollupBridge');
    rollupBridge = await RollupBridge.deploy();
    // Submit and verify two constituency results as any user
    for (let i = 1; i <= 2; i++) {
      const merkleRoot = ethers.encodeBytes32String('root' + i);
      const candidateIds = [1, 2];
      const candidateVotes = [100 * i, 200 * i];
      await rollupBridge.connect(user).submitConstituencyResult(
        i,
        merkleRoot,
        300 * i,
        candidateIds,
        candidateVotes
      );
      // Verify the result
      const leaf = ethers.keccak256(ethers.toUtf8Bytes('leaf' + i));
      await rollupBridge.connect(user).verifyConstituencyResult(i, [], leaf); // Empty proof for test
    }
    await network.provider.send("evm_increaseTime", [3600]);
    await network.provider.send("evm_mine");
  });

  it('Should create a rollup batch with gas tracking', async function() {
    const tx = await rollupBridge.createRollupBatch([1, 2]);
    const receipt = await tx.wait();
    console.log('Gas used for creating rollup batch:', receipt.gasUsed.toString());
    // Check that batchCount is 1
    const batchCount = await rollupBridge.batchCount();
    expect(batchCount).to.equal(1n);
  });
});
