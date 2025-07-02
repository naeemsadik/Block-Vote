// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title RollupBridge
 * @dev Division-tier contract for aggregating Merkle roots from constituency chains
 */
contract RollupBridge is Ownable, ReentrancyGuard, Pausable {
    struct ConstituencyResult {
        uint256 constituencyId;
        bytes32 merkleRoot;
        uint256 totalVotes;
        uint256 timestamp;
        address submitter;
        bool verified;
        mapping(uint256 => uint256) candidateVotes; // candidateId => voteCount
    }
    
    struct RollupBatch {
        uint256 batchId;
        bytes32 aggregatedRoot;
        uint256[] constituencyIds;
        uint256 totalVotes;
        uint256 timestamp;
        bool finalized;
    }
    
    struct Validator {
        address validatorAddress;
        bool isActive;
        uint256 reputation;
        uint256 lastSubmission;
    }
    
    // State variables
    mapping(uint256 => ConstituencyResult) public constituencyResults;
    mapping(uint256 => RollupBatch) public rollupBatches;
    mapping(address => Validator) public validators;
    mapping(bytes32 => bool) public processedRoots;
    
    address[] public activeValidators;
    uint256 public constituencyCount;
    uint256 public batchCount;
    uint256 public rollupInterval = 3600; // 1 hour default
    uint256 public lastRollupTime;
    uint256 public minValidatorReputation = 0;
    
    // Multi-signature configuration
    uint256 public requiredSignatures = 2;
    mapping(uint256 => mapping(address => bool)) public batchSignatures;
    mapping(uint256 => uint256) public batchSignatureCount;
    
    // Events
    event ConstituencyResultSubmitted(
        uint256 indexed constituencyId,
        bytes32 merkleRoot,
        uint256 totalVotes,
        address submitter
    );
    event RollupBatchCreated(
        uint256 indexed batchId,
        bytes32 aggregatedRoot,
        uint256[] constituencyIds,
        uint256 totalVotes
    );
    event RollupBatchFinalized(uint256 indexed batchId, uint256 signatureCount);
    event ValidatorAdded(address indexed validator);
    event ValidatorRemoved(address indexed validator);
    event ResultVerified(uint256 indexed constituencyId, bool verified);
    
    modifier onlyValidator() {
        require(validators[msg.sender].isActive, "Not an active validator");
        require(validators[msg.sender].reputation >= minValidatorReputation, "Insufficient reputation");
        _;
    }
    
    modifier onlyDuringRollupWindow() {
        require(block.timestamp >= lastRollupTime + rollupInterval, "Rollup window not open");
        _;
    }
    
    constructor() {
        lastRollupTime = block.timestamp;
    }
    
    /**
     * @dev Add a validator to the division tier
     */
    function addValidator(address _validator) external onlyOwner {
        require(!validators[_validator].isActive, "Validator already active");
        
        validators[_validator] = Validator({
            validatorAddress: _validator,
            isActive: true,
            reputation: minValidatorReputation,
            lastSubmission: 0
        });
        
        activeValidators.push(_validator);
        
        emit ValidatorAdded(_validator);
    }
    
    /**
     * @dev Remove a validator from the division tier
     */
    function removeValidator(address _validator) external onlyOwner {
        require(validators[_validator].isActive, "Validator not active");
        
        validators[_validator].isActive = false;
        
        // Remove from active validators array
        for (uint256 i = 0; i < activeValidators.length; i++) {
            if (activeValidators[i] == _validator) {
                activeValidators[i] = activeValidators[activeValidators.length - 1];
                activeValidators.pop();
                break;
            }
        }
        
        emit ValidatorRemoved(_validator);
    }
    
    /**
     * @dev Submit constituency results with Merkle root
     */
    function submitConstituencyResult(
        uint256 _constituencyId,
        bytes32 _merkleRoot,
        uint256 _totalVotes,
        uint256[] memory _candidateIds,
        uint256[] memory _candidateVotes
    ) external whenNotPaused nonReentrant {
        require(_candidateIds.length == _candidateVotes.length, "Array length mismatch");
        require(!processedRoots[_merkleRoot], "Merkle root already processed");
        require(_constituencyId > 0, "Invalid constituency ID");
        
        // Verify total votes match sum of candidate votes
        uint256 sumVotes = 0;
        for (uint256 i = 0; i < _candidateVotes.length; i++) {
            sumVotes += _candidateVotes[i];
        }
        require(sumVotes == _totalVotes, "Vote count mismatch");
        
        // Store constituency result
        ConstituencyResult storage result = constituencyResults[_constituencyId];
        result.constituencyId = _constituencyId;
        result.merkleRoot = _merkleRoot;
        result.totalVotes = _totalVotes;
        result.timestamp = block.timestamp;
        result.submitter = msg.sender;
        result.verified = false;
        
        // Store candidate votes
        for (uint256 i = 0; i < _candidateIds.length; i++) {
            result.candidateVotes[_candidateIds[i]] = _candidateVotes[i];
        }
        
        processedRoots[_merkleRoot] = true;
        validators[msg.sender].lastSubmission = block.timestamp;
        validators[msg.sender].reputation += 10; // Increase reputation for submission
        
        if (_constituencyId > constituencyCount) {
            constituencyCount = _constituencyId;
        }
        
        emit ConstituencyResultSubmitted(_constituencyId, _merkleRoot, _totalVotes, msg.sender);
    }
    
    /**
     * @dev Verify constituency result using Merkle proof
     */
    function verifyConstituencyResult(
        uint256 _constituencyId,
        bytes32[] memory _proof,
        bytes32 _leaf
    ) external returns (bool) {
        ConstituencyResult storage result = constituencyResults[_constituencyId];
        require(result.merkleRoot != bytes32(0), "Constituency result not found");
        
        bool isValid = MerkleProof.verify(_proof, result.merkleRoot, _leaf);
        
        if (isValid && !result.verified) {
            result.verified = true;
            validators[msg.sender].reputation += 5; // Reward for verification
            emit ResultVerified(_constituencyId, true);
        }
        
        return isValid;
    }
    
    /**
     * @dev Create a rollup batch aggregating multiple constituency results
     */
    function createRollupBatch(
        uint256[] memory _constituencyIds
    ) external onlyDuringRollupWindow whenNotPaused nonReentrant {
        require(_constituencyIds.length > 0, "No constituencies provided");
        
        // Verify all constituency results exist and are verified
        uint256 totalVotes = 0;
        bytes32[] memory roots = new bytes32[](_constituencyIds.length);
        
        for (uint256 i = 0; i < _constituencyIds.length; i++) {
            uint256 constituencyId = _constituencyIds[i];
            ConstituencyResult storage result = constituencyResults[constituencyId];
            
            require(result.merkleRoot != bytes32(0), "Constituency result not found");
            require(result.verified, "Constituency result not verified");
            
            totalVotes += result.totalVotes;
            roots[i] = result.merkleRoot;
        }
        
        // Create aggregated Merkle root
        bytes32 aggregatedRoot = _computeAggregatedRoot(roots);
        
        batchCount++;
        rollupBatches[batchCount] = RollupBatch({
            batchId: batchCount,
            aggregatedRoot: aggregatedRoot,
            constituencyIds: _constituencyIds,
            totalVotes: totalVotes,
            timestamp: block.timestamp,
            finalized: false
        });
        
        lastRollupTime = block.timestamp;
        validators[msg.sender].reputation += 20; // Reward for batch creation
        
        emit RollupBatchCreated(batchCount, aggregatedRoot, _constituencyIds, totalVotes);
    }
    
    /**
     * @dev Sign a rollup batch for multi-sig approval
     */
    function signRollupBatch(uint256 _batchId) external {
        require(_batchId > 0 && _batchId <= batchCount, "Invalid batch ID");
        require(!rollupBatches[_batchId].finalized, "Batch already finalized");
        require(!batchSignatures[_batchId][msg.sender], "Already signed");
        
        batchSignatures[_batchId][msg.sender] = true;
        batchSignatureCount[_batchId]++;
        
        // Finalize if enough signatures
        if (batchSignatureCount[_batchId] >= requiredSignatures) {
            rollupBatches[_batchId].finalized = true;
            emit RollupBatchFinalized(_batchId, batchSignatureCount[_batchId]);
        }
    }
    
    /**
     * @dev Compute aggregated Merkle root from constituency roots
     */
    function _computeAggregatedRoot(bytes32[] memory _roots) internal pure returns (bytes32) {
        if (_roots.length == 1) {
            return _roots[0];
        }
        
        bytes32[] memory currentLevel = _roots;
        
        while (currentLevel.length > 1) {
            bytes32[] memory nextLevel = new bytes32[]((currentLevel.length + 1) / 2);
            
            for (uint256 i = 0; i < currentLevel.length; i += 2) {
                if (i + 1 < currentLevel.length) {
                    nextLevel[i / 2] = keccak256(abi.encodePacked(currentLevel[i], currentLevel[i + 1]));
                } else {
                    nextLevel[i / 2] = currentLevel[i];
                }
            }
            
            currentLevel = nextLevel;
        }
        
        return currentLevel[0];
    }
    
    /**
     * @dev Get constituency result
     */
    function getConstituencyResult(uint256 _constituencyId) 
        external 
        view 
        returns (
            bytes32 merkleRoot,
            uint256 totalVotes,
            uint256 timestamp,
            address submitter,
            bool verified
        ) 
    {
        ConstituencyResult storage result = constituencyResults[_constituencyId];
        return (
            result.merkleRoot,
            result.totalVotes,
            result.timestamp,
            result.submitter,
            result.verified
        );
    }
    
    /**
     * @dev Get candidate votes for a constituency
     */
    function getConstituencyCandidateVotes(uint256 _constituencyId, uint256 _candidateId) 
        external 
        view 
        returns (uint256) 
    {
        return constituencyResults[_constituencyId].candidateVotes[_candidateId];
    }
    
    /**
     * @dev Get rollup batch information
     */
    function getRollupBatch(uint256 _batchId) external view returns (RollupBatch memory) {
        return rollupBatches[_batchId];
    }
    
    /**
     * @dev Get active validators
     */
    function getActiveValidators() external view returns (address[] memory) {
        return activeValidators;
    }
    
    /**
     * @dev Set rollup interval
     */
    function setRollupInterval(uint256 _interval) external onlyOwner {
        rollupInterval = _interval;
    }
    
    /**
     * @dev Set required signatures for multi-sig
     */
    function setRequiredSignatures(uint256 _required) external onlyOwner {
        require(_required > 0 && _required <= activeValidators.length, "Invalid signature requirement");
        requiredSignatures = _required;
    }
    
    /**
     * @dev Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev TEST-ONLY: Force a validator as active (for testing convenience)
     */
    function forceValidator(address _validator) public {
        validators[_validator] = Validator({
            validatorAddress: _validator,
            isActive: true,
            reputation: minValidatorReputation,
            lastSubmission: block.timestamp
        });
        activeValidators.push(_validator);
    }
    
    /**
     * @dev TEST-ONLY: Force a constituency as verified (for testing convenience)
     */
    function forceVerifyConstituency(uint256 _constituencyId) public {
        constituencyResults[_constituencyId].verified = true;
    }
}