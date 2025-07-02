// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title ConstituencyToken
 * @dev ERC20 token with voting capabilities for PoS consensus in constituency chains
 */
contract ConstituencyToken is ERC20, ERC20Votes, Ownable, Pausable {
    uint256 public constant MIN_STAKE = 10 * 10**18; // 10 tokens minimum stake
    uint256 public constant VALIDATOR_REWARD = 1 * 10**18; // 1 token per block validation
    uint256 public constant MAX_SUPPLY = 1000000 * 10**18; // 1 million tokens max supply
    
    struct Validator {
        address validatorAddress;
        uint256 stakedAmount;
        uint256 delegatedAmount;
        bool isActive;
        uint256 rewardsClaimed;
        uint256 lastRewardBlock;
    }
    
    struct Delegation {
        address delegator;
        address validator;
        uint256 amount;
        uint256 timestamp;
    }
    
    // Validator management
    mapping(address => Validator) public validators;
    mapping(address => mapping(address => uint256)) public delegations; // delegator => validator => amount
    mapping(address => address[]) public delegatorValidators; // delegator => list of validators
    
    address[] public activeValidators;
    uint256 public totalStaked;
    uint256 public currentBlock;
    
    // Events
    event ValidatorRegistered(address indexed validator, uint256 stakedAmount);
    event ValidatorDeactivated(address indexed validator);
    event TokensStaked(address indexed staker, address indexed validator, uint256 amount);
    event TokensUnstaked(address indexed staker, address indexed validator, uint256 amount);
    event RewardsClaimed(address indexed validator, uint256 amount);
    event TokensDelegated(address indexed delegator, address indexed validator, uint256 amount);
    event DelegationWithdrawn(address indexed delegator, address indexed validator, uint256 amount);
    
    modifier onlyValidator() {
        require(validators[msg.sender].isActive, "Not an active validator");
        _;
    }
    
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply
    ) ERC20(_name, _symbol) ERC20Permit(_name) {
        require(_initialSupply <= MAX_SUPPLY, "Initial supply exceeds maximum");
        _mint(msg.sender, _initialSupply);
    }
    
    /**
     * @dev Register as a validator by staking minimum tokens
     */
    function registerValidator() external whenNotPaused {
        require(balanceOf(msg.sender) >= MIN_STAKE, "Insufficient balance for staking");
        require(!validators[msg.sender].isActive, "Already a validator");
        
        // Transfer tokens to contract for staking
        _transfer(msg.sender, address(this), MIN_STAKE);
        
        validators[msg.sender] = Validator({
            validatorAddress: msg.sender,
            stakedAmount: MIN_STAKE,
            delegatedAmount: 0,
            isActive: true,
            rewardsClaimed: 0,
            lastRewardBlock: currentBlock
        });
        
        activeValidators.push(msg.sender);
        totalStaked += MIN_STAKE;
        
        emit ValidatorRegistered(msg.sender, MIN_STAKE);
        emit TokensStaked(msg.sender, msg.sender, MIN_STAKE);
    }
    
    /**
     * @dev Stake additional tokens to increase validator power
     */
    function stakeTokens(uint256 _amount) external onlyValidator whenNotPaused {
        require(_amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= _amount, "Insufficient balance");
        
        _transfer(msg.sender, address(this), _amount);
        
        validators[msg.sender].stakedAmount += _amount;
        totalStaked += _amount;
        
        emit TokensStaked(msg.sender, msg.sender, _amount);
    }
    
    /**
     * @dev Delegate tokens to a validator
     */
    function delegateTokens(address _validator, uint256 _amount) external whenNotPaused {
        require(validators[_validator].isActive, "Validator not active");
        require(_amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= _amount, "Insufficient balance");
        
        _transfer(msg.sender, address(this), _amount);
        
        if (delegations[msg.sender][_validator] == 0) {
            delegatorValidators[msg.sender].push(_validator);
        }
        
        delegations[msg.sender][_validator] += _amount;
        validators[_validator].delegatedAmount += _amount;
        totalStaked += _amount;
        
        emit TokensDelegated(msg.sender, _validator, _amount);
    }
    
    /**
     * @dev Withdraw delegated tokens
     */
    function withdrawDelegation(address _validator, uint256 _amount) external {
        require(delegations[msg.sender][_validator] >= _amount, "Insufficient delegation");
        require(_amount > 0, "Amount must be greater than 0");
        
        delegations[msg.sender][_validator] -= _amount;
        validators[_validator].delegatedAmount -= _amount;
        totalStaked -= _amount;
        
        _transfer(address(this), msg.sender, _amount);
        
        emit DelegationWithdrawn(msg.sender, _validator, _amount);
    }
    
    /**
     * @dev Unstake tokens and deactivate validator if below minimum
     */
    function unstakeTokens(uint256 _amount) external onlyValidator {
        require(_amount > 0, "Amount must be greater than 0");
        require(validators[msg.sender].stakedAmount >= _amount, "Insufficient staked amount");
        
        validators[msg.sender].stakedAmount -= _amount;
        totalStaked -= _amount;
        
        // Deactivate validator if below minimum stake
        if (validators[msg.sender].stakedAmount < MIN_STAKE) {
            _deactivateValidator(msg.sender);
        }
        
        _transfer(address(this), msg.sender, _amount);
        
        emit TokensUnstaked(msg.sender, msg.sender, _amount);
    }
    
    /**
     * @dev Claim validator rewards
     */
    function claimRewards() external onlyValidator {
        uint256 blocksSinceLastReward = currentBlock - validators[msg.sender].lastRewardBlock;
        uint256 rewards = blocksSinceLastReward * VALIDATOR_REWARD;
        
        require(rewards > 0, "No rewards to claim");
        require(totalSupply() + rewards <= MAX_SUPPLY, "Would exceed max supply");
        
        validators[msg.sender].rewardsClaimed += rewards;
        validators[msg.sender].lastRewardBlock = currentBlock;
        
        _mint(msg.sender, rewards);
        
        emit RewardsClaimed(msg.sender, rewards);
    }
    
    /**
     * @dev Advance block number (called by consensus mechanism)
     */
    function advanceBlock() external onlyOwner {
        currentBlock++;
    }
    
    /**
     * @dev Deactivate a validator
     */
    function _deactivateValidator(address _validator) internal {
        validators[_validator].isActive = false;
        
        // Remove from active validators array
        for (uint256 i = 0; i < activeValidators.length; i++) {
            if (activeValidators[i] == _validator) {
                activeValidators[i] = activeValidators[activeValidators.length - 1];
                activeValidators.pop();
                break;
            }
        }
        
        emit ValidatorDeactivated(_validator);
    }
    
    /**
     * @dev Get validator information
     */
    function getValidator(address _validator) external view returns (Validator memory) {
        return validators[_validator];
    }
    
    /**
     * @dev Get total voting power of a validator (staked + delegated)
     */
    function getValidatorPower(address _validator) external view returns (uint256) {
        return validators[_validator].stakedAmount + validators[_validator].delegatedAmount;
    }
    
    /**
     * @dev Get all active validators
     */
    function getActiveValidators() external view returns (address[] memory) {
        return activeValidators;
    }
    
    /**
     * @dev Get delegation amount
     */
    function getDelegation(address _delegator, address _validator) external view returns (uint256) {
        return delegations[_delegator][_validator];
    }
    
    /**
     * @dev Get validators that a delegator has delegated to
     */
    function getDelegatorValidators(address _delegator) external view returns (address[] memory) {
        return delegatorValidators[_delegator];
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
     * @dev Mint tokens (only owner, for initial distribution)
     */
    function mint(address _to, uint256 _amount) external onlyOwner {
        require(totalSupply() + _amount <= MAX_SUPPLY, "Would exceed max supply");
        _mint(_to, _amount);
    }
    
    // Override required by Solidity
    function _afterTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._afterTokenTransfer(from, to, amount);
    }
    
    function _mint(address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._mint(to, amount);
    }
    
    function _burn(address account, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._burn(account, amount);
    }
}