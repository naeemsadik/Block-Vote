// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./ConstituencyToken.sol";

/**
 * @title Voting
 * @dev Constituency-tier voting contract for secure vote casting and verification
 */
contract Voting is ReentrancyGuard, Ownable {
    ConstituencyToken public immutable constituencyToken;
    
    // Represents a  Candidate in the election
    struct Candidate {
        uint256 id;
        string name;
        string party;
        uint256 voteCount;
        bool isActive;
    }
    
    // Represents a vote of a voter in the election
    struct Vote {
        address voter;
        uint256 candidateId;
        uint256 timestamp;
        bytes32 proof;
    }
    
    // Basic voting parameters e.g when to start, when to end, etc
    bool public votingActive;
    uint256 public votingStartTime;
    uint256 public votingEndTime;
    uint256 public totalVotes;
    
    // Candidates of the election
    mapping(uint256 => Candidate) public candidates;
    uint256 public candidateCount;
    
    // Voting records
    mapping(address => bool) public hasVoted;
    mapping(address => Vote) public votes;
    mapping(uint256 => uint256) public candidateVotes;
    
    // Merkle tree for batch verification
    bytes32 public merkleRoot;
    mapping(bytes32 => bool) public usedProofs;
    
    // Events
    event VoteCast(address indexed voter, uint256 indexed candidateId, uint256 timestamp);
    event CandidateAdded(uint256 indexed candidateId, string name, string party);
    event VotingStarted(uint256 startTime, uint256 endTime);
    event VotingEnded(uint256 endTime, uint256 totalVotes);
    event MerkleRootUpdated(bytes32 newRoot);
    
    modifier onlyDuringVoting() {
        require(votingActive && block.timestamp >= votingStartTime && block.timestamp <= votingEndTime, "Voting not active");
        _;
    }
    
    modifier onlyEligibleVoter() {
        require(constituencyToken.balanceOf(msg.sender) > 0, "Not eligible to vote");
        require(!hasVoted[msg.sender], "Already voted");
        _;
    }
    
    constructor(address _tokenAddress) {
        constituencyToken = ConstituencyToken(_tokenAddress);
    }
    
    /**
     * @dev Add a candidate to the election
     */
    function addCandidate(string memory _name, string memory _party) external onlyOwner {
        require(!votingActive, "Cannot add candidates during voting");
        
        candidateCount++;
        candidates[candidateCount] = Candidate({
            id: candidateCount,
            name: _name,
            party: _party,
            voteCount: 0,
            isActive: true
        });
        
        emit CandidateAdded(candidateCount, _name, _party);
    }
    
    /**
     * @dev Start the voting period
     */
    function startVoting(uint256 _duration) external onlyOwner {
        require(!votingActive, "Voting already active");
        require(candidateCount > 0, "No candidates added");
        
        votingActive = true;
        votingStartTime = block.timestamp;
        votingEndTime = block.timestamp + _duration;
        
        emit VotingStarted(votingStartTime, votingEndTime);
    }
    
    /**
     * @dev End the voting period
     */
    function endVoting() external onlyOwner {
        require(votingActive, "Voting not active");
        
        votingActive = false;
        
        emit VotingEnded(block.timestamp, totalVotes);
    }
    
    /**
     * @dev Cast a vote for a candidate
     */
    function castVote(uint256 _candidateId) external onlyDuringVoting onlyEligibleVoter nonReentrant {
        require(_candidateId > 0 && _candidateId <= candidateCount, "Invalid candidate");
        require(candidates[_candidateId].isActive, "Candidate not active");
        
        // Record the vote
        hasVoted[msg.sender] = true;
        votes[msg.sender] = Vote({
            voter: msg.sender,
            candidateId: _candidateId,
            timestamp: block.timestamp,
            proof: keccak256(abi.encodePacked(msg.sender, _candidateId, block.timestamp))
        });
        
        // Update vote counts
        candidates[_candidateId].voteCount++;
        candidateVotes[_candidateId]++;
        totalVotes++;
        
        emit VoteCast(msg.sender, _candidateId, block.timestamp);
    }
    
    /**
     * @dev Batch verify votes using Merkle proof
     */
    function batchVerifyVotes(bytes32[] memory _proof, bytes32 _leaf) external view returns (bool) {
        return MerkleProof.verify(_proof, merkleRoot, _leaf);
    }
    
    /**
     * @dev Update Merkle root for batch verification
     */
    function updateMerkleRoot(bytes32 _newRoot) external onlyOwner {
        merkleRoot = _newRoot;
        emit MerkleRootUpdated(_newRoot);
    }
    
    /**
     * @dev Get candidate information
     */
    function getCandidate(uint256 _candidateId) external view returns (Candidate memory) {
        require(_candidateId > 0 && _candidateId <= candidateCount, "Invalid candidate ID");
        return candidates[_candidateId];
    }
    
    /**
     * @dev Get all candidates
     */
    function getAllCandidates() external view returns (Candidate[] memory) {
        Candidate[] memory allCandidates = new Candidate[](candidateCount);
        for (uint256 i = 1; i <= candidateCount; i++) {
            allCandidates[i-1] = candidates[i];
        }
        return allCandidates;
    }
    
    /**
     * @dev Get vote results
     */
    function getResults() external view returns (uint256[] memory, uint256[] memory) {
        uint256[] memory candidateIds = new uint256[](candidateCount);
        uint256[] memory voteCounts = new uint256[](candidateCount);
        
        for (uint256 i = 1; i <= candidateCount; i++) {
            candidateIds[i-1] = i;
            voteCounts[i-1] = candidates[i].voteCount;
        }
        
        return (candidateIds, voteCounts);
    }
    
    /**
     * @dev Get voter's vote information
     */
    function getVoterVote(address _voter) external view returns (Vote memory) {
        require(hasVoted[_voter], "Voter has not voted");
        return votes[_voter];
    }
    
    /**
     * @dev Generate Merkle leaf for a vote
     */
    function generateVoteLeaf(address _voter, uint256 _candidateId, uint256 _timestamp) 
        external 
        pure 
        returns (bytes32) 
    {
        return keccak256(abi.encodePacked(_voter, _candidateId, _timestamp));
    }
    
    /**
     * @dev Get voting statistics
     */
    function getVotingStats() external view returns (
        uint256 _totalVotes,
        uint256 _candidateCount,
        bool _isActive,
        uint256 _startTime,
        uint256 _endTime
    ) {
        return (totalVotes, candidateCount, votingActive, votingStartTime, votingEndTime);
    }
}