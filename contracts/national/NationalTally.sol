// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title NationalTally
 * @dev National-tier contract for final vote aggregation and result publication
 */
contract NationalTally is Ownable, ReentrancyGuard, Pausable {
    struct DivisionResult {
        uint256 divisionId;
        bytes32 aggregatedRoot;
        uint256 totalVotes;
        uint256 timestamp;
        address submitter;
        bool verified;
        bool finalized;
        mapping(uint256 => uint256) candidateVotes; // candidateId => voteCount
    }
    
    struct NationalResult {
        uint256 totalVotes;
        uint256 totalDivisions;
        uint256 timestamp;
        bool finalized;
        address finalizer;
        mapping(uint256 => uint256) candidateVotes; // candidateId => voteCount
        mapping(uint256 => string) candidateNames; // candidateId => name
    }
    
    struct Candidate {
        uint256 id;
        string name;
        string party;
        uint256 totalVotes;
        bool isActive;
    }
    
    struct AuditRecord {
        uint256 timestamp;
        address auditor;
        string action;
        bytes32 dataHash;
        bool verified;
    }
    
    // State variables
    mapping(uint256 => DivisionResult) public divisionResults;
    mapping(uint256 => Candidate) public candidates;
    mapping(address => bool) public authorizedDivisionValidators;
    mapping(bytes32 => bool) public processedRoots;
    
    NationalResult public nationalResult;
    AuditRecord[] public auditTrail;
    
    uint256 public divisionCount;
    uint256 public candidateCount;
    uint256 public expectedDivisions;
    bool public electionFinalized;
    
    // Multi-signature for critical operations
    mapping(address => bool) public nationalValidators;
    mapping(bytes32 => mapping(address => bool)) public operationSignatures;
    mapping(bytes32 => uint256) public operationSignatureCount;
    uint256 public requiredNationalSignatures = 3;
    
    // Energy tracking
    uint256 public totalGasUsed;
    uint256 public totalTransactions;
    
    // Events
    event DivisionResultSubmitted(
        uint256 indexed divisionId,
        bytes32 aggregatedRoot,
        uint256 totalVotes,
        address submitter
    );
    event NationalResultFinalized(
        uint256 totalVotes,
        uint256 totalDivisions,
        address finalizer
    );
    event CandidateAdded(uint256 indexed candidateId, string name, string party);
    event AuditRecordAdded(uint256 indexed recordId, address auditor, string action);
    event ValidatorAuthorized(address indexed validator, string role);
    event ValidatorRevoked(address indexed validator, string role);
    event ElectionFinalized(uint256 timestamp, uint256 totalVotes);
    
    modifier onlyDivisionValidator() {
        require(authorizedDivisionValidators[msg.sender], "Not authorized division validator");
        _;
    }
    
    modifier onlyNationalValidator() {
        require(nationalValidators[msg.sender], "Not authorized national validator");
        _;
    }
    
    modifier onlyBeforeFinalization() {
        require(!electionFinalized, "Election already finalized");
        _;
    }
    
    constructor(uint256 _expectedDivisions) {
        expectedDivisions = _expectedDivisions;
        nationalResult.timestamp = block.timestamp;
    }
    
    /**
     * @dev Add a candidate to the national election
     */
    function addCandidate(string memory _name, string memory _party) external onlyOwner onlyBeforeFinalization {
        candidateCount++;
        candidates[candidateCount] = Candidate({
            id: candidateCount,
            name: _name,
            party: _party,
            totalVotes: 0,
            isActive: true
        });
        
        nationalResult.candidateNames[candidateCount] = _name;
        
        emit CandidateAdded(candidateCount, _name, _party);
        _addAuditRecord("CANDIDATE_ADDED", keccak256(abi.encodePacked(_name, _party)));
    }
    
    /**
     * @dev Authorize a division validator
     */
    function authorizeDivisionValidator(address _validator) external onlyOwner {
        authorizedDivisionValidators[_validator] = true;
        emit ValidatorAuthorized(_validator, "DIVISION");
        _addAuditRecord("VALIDATOR_AUTHORIZED", keccak256(abi.encodePacked(_validator, "DIVISION")));
    }
    
    /**
     * @dev Authorize a national validator
     */
    function authorizeNationalValidator(address _validator) external onlyOwner {
        nationalValidators[_validator] = true;
        emit ValidatorAuthorized(_validator, "NATIONAL");
        _addAuditRecord("VALIDATOR_AUTHORIZED", keccak256(abi.encodePacked(_validator, "NATIONAL")));
    }
    
    /**
     * @dev Submit division results to national tally
     */
    function submitDivisionResult(
        uint256 _divisionId,
        bytes32 _aggregatedRoot,
        uint256 _totalVotes,
        uint256[] memory _candidateIds,
        uint256[] memory _candidateVotes
    ) external onlyDivisionValidator onlyBeforeFinalization whenNotPaused nonReentrant {
        require(_candidateIds.length == _candidateVotes.length, "Array length mismatch");
        require(!processedRoots[_aggregatedRoot], "Root already processed");
        require(_divisionId > 0 && _divisionId <= expectedDivisions, "Invalid division ID");
        require(divisionResults[_divisionId].timestamp == 0, "Division result already submitted");
        
        // Verify total votes match sum of candidate votes
        uint256 sumVotes = 0;
        for (uint256 i = 0; i < _candidateVotes.length; i++) {
            sumVotes += _candidateVotes[i];
        }
        require(sumVotes == _totalVotes, "Vote count mismatch");
        
        // Store division result
        DivisionResult storage result = divisionResults[_divisionId];
        result.divisionId = _divisionId;
        result.aggregatedRoot = _aggregatedRoot;
        result.totalVotes = _totalVotes;
        result.timestamp = block.timestamp;
        result.submitter = msg.sender;
        result.verified = false;
        result.finalized = false;
        
        // Store candidate votes
        for (uint256 i = 0; i < _candidateIds.length; i++) {
            result.candidateVotes[_candidateIds[i]] = _candidateVotes[i];
        }
        
        processedRoots[_aggregatedRoot] = true;
        divisionCount++;
        
        // Track gas usage
        totalGasUsed += gasleft();
        totalTransactions++;
        
        emit DivisionResultSubmitted(_divisionId, _aggregatedRoot, _totalVotes, msg.sender);
        _addAuditRecord("DIVISION_RESULT_SUBMITTED", _aggregatedRoot);
    }
    
    /**
     * @dev Verify division result using Merkle proof
     */
    function verifyDivisionResult(
        uint256 _divisionId,
        bytes32[] memory _proof,
        bytes32 _leaf
    ) external onlyNationalValidator returns (bool) {
        DivisionResult storage result = divisionResults[_divisionId];
        require(result.aggregatedRoot != bytes32(0), "Division result not found");
        
        bool isValid = MerkleProof.verify(_proof, result.aggregatedRoot, _leaf);
        
        if (isValid && !result.verified) {
            result.verified = true;
            _addAuditRecord("DIVISION_RESULT_VERIFIED", result.aggregatedRoot);
        }
        
        return isValid;
    }
    
    /**
     * @dev Finalize division result with multi-sig
     */
    function finalizeDivisionResult(uint256 _divisionId) external onlyNationalValidator {
        require(divisionResults[_divisionId].verified, "Division result not verified");
        require(!divisionResults[_divisionId].finalized, "Division already finalized");
        
        bytes32 operationHash = keccak256(abi.encodePacked("FINALIZE_DIVISION", _divisionId));
        
        if (!operationSignatures[operationHash][msg.sender]) {
            operationSignatures[operationHash][msg.sender] = true;
            operationSignatureCount[operationHash]++;
        }
        
        if (operationSignatureCount[operationHash] >= requiredNationalSignatures) {
            divisionResults[_divisionId].finalized = true;
            _addAuditRecord("DIVISION_RESULT_FINALIZED", operationHash);
        }
    }
    
    /**
     * @dev Compute and finalize national results
     */
    function finalizeNationalResult() external onlyNationalValidator onlyBeforeFinalization whenNotPaused {
        require(divisionCount == expectedDivisions, "Not all divisions submitted");
        
        // Verify all divisions are finalized
        for (uint256 i = 1; i <= expectedDivisions; i++) {
            require(divisionResults[i].finalized, "Division not finalized");
        }
        
        bytes32 operationHash = keccak256(abi.encodePacked("FINALIZE_NATIONAL", block.timestamp));
        
        if (!operationSignatures[operationHash][msg.sender]) {
            operationSignatures[operationHash][msg.sender] = true;
            operationSignatureCount[operationHash]++;
        }
        
        if (operationSignatureCount[operationHash] >= requiredNationalSignatures) {
            _computeNationalResults();
            electionFinalized = true;
            nationalResult.finalized = true;
            nationalResult.finalizer = msg.sender;
            
            emit NationalResultFinalized(nationalResult.totalVotes, nationalResult.totalDivisions, msg.sender);
            emit ElectionFinalized(block.timestamp, nationalResult.totalVotes);
            _addAuditRecord("NATIONAL_RESULT_FINALIZED", operationHash);
        }
    }
    
    /**
     * @dev Compute national results from all divisions
     */
    function _computeNationalResults() internal {
        uint256 totalVotes = 0;
        
        // Aggregate votes from all divisions
        for (uint256 divisionId = 1; divisionId <= expectedDivisions; divisionId++) {
            DivisionResult storage divResult = divisionResults[divisionId];
            totalVotes += divResult.totalVotes;
            
            // Aggregate candidate votes
            for (uint256 candidateId = 1; candidateId <= candidateCount; candidateId++) {
                uint256 divisionVotes = divResult.candidateVotes[candidateId];
                nationalResult.candidateVotes[candidateId] += divisionVotes;
                candidates[candidateId].totalVotes += divisionVotes;
            }
        }
        
        nationalResult.totalVotes = totalVotes;
        nationalResult.totalDivisions = expectedDivisions;
        nationalResult.timestamp = block.timestamp;
    }
    
    /**
     * @dev Add audit record
     */
    function _addAuditRecord(string memory _action, bytes32 _dataHash) internal {
        auditTrail.push(AuditRecord({
            timestamp: block.timestamp,
            auditor: msg.sender,
            action: _action,
            dataHash: _dataHash,
            verified: true
        }));
        
        emit AuditRecordAdded(auditTrail.length - 1, msg.sender, _action);
    }
    
    /**
     * @dev Get national results
     */
    function getNationalResults() external view returns (
        uint256 totalVotes,
        uint256 totalDivisions,
        uint256 timestamp,
        bool finalized
    ) {
        return (
            nationalResult.totalVotes,
            nationalResult.totalDivisions,
            nationalResult.timestamp,
            nationalResult.finalized
        );
    }
    
    /**
     * @dev Get candidate results
     */
    function getCandidateResults(uint256 _candidateId) external view returns (
        string memory name,
        string memory party,
        uint256 totalVotes,
        bool isActive
    ) {
        Candidate memory candidate = candidates[_candidateId];
        return (candidate.name, candidate.party, candidate.totalVotes, candidate.isActive);
    }
    
    /**
     * @dev Get all candidates with results
     */
    function getAllCandidateResults() external view returns (
        uint256[] memory ids,
        string[] memory names,
        string[] memory parties,
        uint256[] memory votes
    ) {
        ids = new uint256[](candidateCount);
        names = new string[](candidateCount);
        parties = new string[](candidateCount);
        votes = new uint256[](candidateCount);
        
        for (uint256 i = 1; i <= candidateCount; i++) {
            Candidate memory candidate = candidates[i];
            ids[i-1] = candidate.id;
            names[i-1] = candidate.name;
            parties[i-1] = candidate.party;
            votes[i-1] = candidate.totalVotes;
        }
        
        return (ids, names, parties, votes);
    }
    
    /**
     * @dev Get division result
     */
    function getDivisionResult(uint256 _divisionId) external view returns (
        bytes32 aggregatedRoot,
        uint256 totalVotes,
        uint256 timestamp,
        address submitter,
        bool verified,
        bool finalized
    ) {
        DivisionResult storage result = divisionResults[_divisionId];
        return (
            result.aggregatedRoot,
            result.totalVotes,
            result.timestamp,
            result.submitter,
            result.verified,
            result.finalized
        );
    }
    
    /**
     * @dev Get audit trail
     */
    function getAuditTrail() external view returns (AuditRecord[] memory) {
        return auditTrail;
    }
    
    /**
     * @dev Get energy statistics
     */
    function getEnergyStats() external view returns (
        uint256 gasUsed,
        uint256 transactions,
        uint256 avgGasPerTransaction
    ) {
        uint256 avgGas = totalTransactions > 0 ? totalGasUsed / totalTransactions : 0;
        return (totalGasUsed, totalTransactions, avgGas);
    }
    
    /**
     * @dev Set required signatures for national operations
     */
    function setRequiredNationalSignatures(uint256 _required) external onlyOwner {
        require(_required > 0, "Invalid signature requirement");
        requiredNationalSignatures = _required;
    }
    
    /**
     * @dev Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}