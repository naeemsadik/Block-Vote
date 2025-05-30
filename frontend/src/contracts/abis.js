export const NationalTallyABI = [
  // Add your NationalTally contract ABI here
  "function getAllCandidates() view returns (tuple(uint256 id, string name, string party, string constituency, string manifesto, bool isActive, uint256 voteCount)[])",
  "function addCandidate(string name, string party, string constituency, string manifesto)",
  "function updateCandidate(uint256 id, string name, string party, string constituency, string manifesto)",
  "function removeCandidate(uint256 id)",
  "function getVotingStats() view returns (bool _isActive, uint256 _totalVotes, uint256 _candidateCount, uint256 _startTime, uint256 _endTime)",
  "function startVoting(uint256 duration)",
  "function endVoting()",
  "function authorizeDivisionValidator(address validator)",
  "function totalGasUsed() view returns (uint256)",
  "function totalTransactions() view returns (uint256)",
  "event DivisionResultSubmitted(uint256 indexed divisionId, uint256 timestamp, uint256 gasUsed)",
  "event AuditRecordAdded(uint256 indexed recordId, address auditor, string action, bytes32 dataHash, bool verified)",
  "event ValidatorAuthorized(address indexed validator, string role)"
];

export const VotingABI = [
  // Add your Voting contract ABI here
  "function getAllCandidates() view returns (tuple(uint256 id, string name, string party, uint256 voteCount)[])",
  "function castVote(uint256 candidateId)",
  "function hasVoted(address voter) view returns (bool)",
  "function getVotingStats() view returns (bool _isActive, uint256 _totalVotes, uint256 _candidateCount, uint256 _startTime, uint256 _endTime)",
  "function getResults() view returns (uint256[] candidateIds, uint256[] voteCounts)"
];

export const ConstituencyTokenABI = [
  // Add your ConstituencyToken contract ABI here
  "function registerVoter(string name, string email, uint256 constituency, string idNumber, string address)",
  "function getConstituencyCount() view returns (uint256)",
  "function getConstituency(uint256 id) view returns (string name)",
  "function getVoterToken(address voter) view returns (string)"
]; 