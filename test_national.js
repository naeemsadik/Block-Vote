const { expect } = require('chai');
const hre = require('hardhat');
const { ethers } = hre;

describe('NationalTally Contract Tests', function() {
  let NationalTally, nationalTally, owner, validator;
  
  before(async function() {
    [owner, validator] = await ethers.getSigners();
    NationalTally = await ethers.getContractFactory('NationalTally');
    nationalTally = await NationalTally.deploy(1); // 1 expected division
    
    // Authorize validator
    await nationalTally.authorizeDivisionValidator(validator.address);
  });

  it('Should submit and verify division results', async function() {
    const candidateIds = [1, 2];
    const candidateVotes = [500, 300];
    const tx = await nationalTally.connect(validator).submitDivisionResult(
      1, 
      ethers.encodeBytes32String('testRoot'), 
      800, 
      candidateIds, 
      candidateVotes
    );
    const receipt = await tx.wait();
    
    console.log('Gas used for division submission:', receipt.gasUsed.toString());
    
    const division = await nationalTally.divisionResults(1);
    expect(division.totalVotes).to.equal(800);
  });
});
