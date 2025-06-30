const { expect } = require('chai');
const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Voting Contract Tests', function() {
  let Voting, voting, owner, voters;
  let gasUsed = [];

  before(async function() {
    [owner, ...voters] = await ethers.getSigners();
    console.log('Owner:', owner.address);
    console.log('Voters:', voters.map(v => v.address));
    
    Voting = await ethers.getContractFactory('Voting');
    voting = await Voting.deploy(ethers.constants.AddressZero); // Use zero address for testing
    await voting.deployed();
    console.log('Voting contract deployed at:', voting.address);

    // Add candidates
    console.log('Adding candidates...');
    await voting.connect(owner).addCandidate('Candidate 1', 'Party A');
    await voting.connect(owner).addCandidate('Candidate 2', 'Party B');
    
    console.log('Starting voting period...');
    await voting.connect(owner).startVoting(3600); // 1 hour voting period
    
    const isActive = await voting.votingActive();
    console.log('Voting active:', isActive);
  });

  it('Should cast votes and track gas usage', async function() {
    this.timeout(10000); // Increase timeout for multiple transactions
    
    // Cast 5 votes from different voters
    for (let i = 0; i < 5; i++) {
      const tx = await voting.connect(voters[i]).castVote(1, []); // Empty proof array
      const receipt = await tx.wait();
      gasUsed.push({
        voter: voters[i].address,
        gasUsed: receipt.gasUsed.toString(),
        cumulativeGas: receipt.cumulativeGasUsed.toString()
      });
    }

    expect(gasUsed.length).to.equal(5);
    console.log('Gas usage details:', JSON.stringify(gasUsed, null, 2));
  });

  it('Should validate vote counts', async function() {
    const candidate = await voting.candidates(1);
    console.log('Candidate 1 vote count:', candidate.voteCount);
    expect(candidate.voteCount).to.equal(5);
    
    const totalVotes = await voting.totalVotes();
    console.log('Total votes:', totalVotes);
    expect(totalVotes).to.equal(5);
  });
});