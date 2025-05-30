const { ethers } = require('ethers');
const fs = require('fs').promises;
const path = require('path');

class BlockchainService {
  constructor() {
    this.providers = {};
    this.contracts = {};
    this.signers = {};
    this.initialized = false;
  }

  /**
   * Initialize blockchain service with network configurations
   */
  async initialize() {
    try {
      // Initialize providers for different tiers
      await this.initializeProviders();
      
      // Load contract ABIs and addresses
      await this.loadContracts();
      
      // Initialize signers
      await this.initializeSigners();
      
      this.initialized = true;
      console.log('BlockchainService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize BlockchainService:', error);
      throw error;
    }
  }

  /**
   * Initialize providers for different network tiers
   */
  async initializeProviders() {
    // Constituency tier (public testnet)
    this.providers.constituency = new ethers.JsonRpcProvider(
      process.env.CONSTITUENCY_RPC_URL || 'http://localhost:8545'
    );

    // Division tier (private network)
    this.providers.division = new ethers.JsonRpcProvider(
      process.env.DIVISION_RPC_URL || 'http://localhost:8546'
    );

    // National tier (private network)
    this.providers.national = new ethers.JsonRpcProvider(
      process.env.NATIONAL_RPC_URL || 'http://localhost:8547'
    );

    // Test connectivity
    for (const [tier, provider] of Object.entries(this.providers)) {
      try {
        await provider.getNetwork();
        console.log(`${tier} provider connected successfully`);
      } catch (error) {
        console.warn(`Failed to connect to ${tier} provider:`, error.message);
      }
    }
  }

  /**
   * Load contract ABIs and addresses
   */
  async loadContracts() {
    try {
      // Load deployment addresses
      const deploymentPath = path.join(__dirname, '../../contracts/deployments.json');
      let deployments = {};
      
      try {
        const deploymentData = await fs.readFile(deploymentPath, 'utf8');
        deployments = JSON.parse(deploymentData);
      } catch (error) {
        console.warn('Deployment file not found, using default addresses');
      }

      // Load contract ABIs
      const contractsDir = path.join(__dirname, '../../contracts/build/contracts');
      
      // Constituency contracts
      this.contracts.constituency = {
        voting: await this.loadContract('Voting', contractsDir, deployments.constituency?.voting),
        token: await this.loadContract('ConstituencyToken', contractsDir, deployments.constituency?.token)
      };

      // Division contracts
      this.contracts.division = {
        rollupBridge: await this.loadContract('RollupBridge', contractsDir, deployments.division?.rollupBridge)
      };

      // National contracts
      this.contracts.national = {
        nationalTally: await this.loadContract('NationalTally', contractsDir, deployments.national?.nationalTally)
      };

    } catch (error) {
      console.error('Failed to load contracts:', error);
      throw error;
    }
  }

  /**
   * Load individual contract ABI and create contract instance
   */
  async loadContract(contractName, contractsDir, address) {
    try {
      const artifactPath = path.join(contractsDir, `${contractName}.json`);
      const artifact = JSON.parse(await fs.readFile(artifactPath, 'utf8'));
      
      return {
        abi: artifact.abi,
        address: address || null,
        bytecode: artifact.bytecode
      };
    } catch (error) {
      console.warn(`Failed to load contract ${contractName}:`, error.message);
      return { abi: [], address: null, bytecode: null };
    }
  }

  /**
   * Initialize signers for different tiers
   */
  async initializeSigners() {
    const privateKeys = {
      constituency: process.env.CONSTITUENCY_PRIVATE_KEY,
      division: process.env.DIVISION_PRIVATE_KEY,
      national: process.env.NATIONAL_PRIVATE_KEY
    };

    for (const [tier, privateKey] of Object.entries(privateKeys)) {
      if (privateKey && this.providers[tier]) {
        this.signers[tier] = new ethers.Wallet(privateKey, this.providers[tier]);
      }
    }
  }

  /**
   * Get contract instance for specific tier and contract
   */
  getContract(tier, contractName, signerRequired = false) {
    if (!this.initialized) {
      throw new Error('BlockchainService not initialized');
    }

    const contractInfo = this.contracts[tier]?.[contractName];
    if (!contractInfo || !contractInfo.address) {
      throw new Error(`Contract ${contractName} not found for tier ${tier}`);
    }

    const provider = signerRequired ? this.signers[tier] : this.providers[tier];
    if (!provider) {
      throw new Error(`Provider/Signer not available for tier ${tier}`);
    }

    return new ethers.Contract(contractInfo.address, contractInfo.abi, provider);
  }

  // ==================== CONSTITUENCY TIER METHODS ====================

  /**
   * Get constituency contract addresses
   */
  async getConstituencyContracts() {
    return {
      voting: this.contracts.constituency.voting.address,
      token: this.contracts.constituency.token.address
    };
  }

  /**
   * Cast a vote in constituency
   */
  async castVote(candidateId, voterAddress, merkleProof = []) {
    const votingContract = this.getContract('constituency', 'voting', true);
    
    const tx = await votingContract.castVote(candidateId, merkleProof);
    const receipt = await tx.wait();
    
    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get constituency candidates
   */
  async getConstituencyCandidates() {
    const votingContract = this.getContract('constituency', 'voting');
    
    const candidateCount = await votingContract.getCandidateCount();
    const candidates = [];
    
    for (let i = 0; i < candidateCount; i++) {
      const candidate = await votingContract.getCandidate(i);
      candidates.push({
        id: i,
        name: candidate.name,
        voteCount: candidate.voteCount.toString(),
        isActive: candidate.isActive
      });
    }
    
    return candidates;
  }

  /**
   * Get constituency voting results
   */
  async getConstituencyResults() {
    const votingContract = this.getContract('constituency', 'voting');
    
    const results = await votingContract.getResults();
    return {
      totalVotes: results.totalVotes.toString(),
      candidateVotes: results.candidateVotes.map(v => v.toString()),
      merkleRoot: results.merkleRoot,
      isFinalized: results.isFinalized
    };
  }

  /**
   * Generate Merkle proof for vote verification
   */
  async generateMerkleProof(voterAddress, voteData) {
    const votingContract = this.getContract('constituency', 'voting');
    
    try {
      const proof = await votingContract.generateMerkleProof(voterAddress, voteData);
      return proof;
    } catch (error) {
      console.error('Failed to generate Merkle proof:', error);
      throw error;
    }
  }

  /**
   * Verify vote with Merkle proof
   */
  async verifyVoteProof(voterAddress, candidateId, merkleProof) {
    const votingContract = this.getContract('constituency', 'voting');
    
    const isValid = await votingContract.verifyVote(voterAddress, candidateId, merkleProof);
    return isValid;
  }

  /**
   * Get constituency validators
   */
  async getConstituencyValidators() {
    const tokenContract = this.getContract('constituency', 'token');
    
    const validatorCount = await tokenContract.getValidatorCount();
    const validators = [];
    
    for (let i = 0; i < validatorCount; i++) {
      const validator = await tokenContract.getValidator(i);
      validators.push({
        address: validator.validatorAddress,
        stake: validator.stake.toString(),
        isActive: validator.isActive,
        reputation: validator.reputation.toString()
      });
    }
    
    return validators;
  }

  // ==================== DIVISION TIER METHODS ====================

  /**
   * Get division contract addresses
   */
  async getDivisionContracts() {
    return {
      rollupBridge: this.contracts.division.rollupBridge.address
    };
  }

  /**
   * Submit constituency rollup to division
   */
  async submitConstituencyRollup(constituencyId, merkleRoot, totalVotes, validatorAddress) {
    const rollupContract = this.getContract('division', 'rollupBridge', true);
    
    const tx = await rollupContract.submitConstituencyResult(
      constituencyId,
      merkleRoot,
      totalVotes
    );
    const receipt = await tx.wait();
    
    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create rollup batch
   */
  async createRollupBatch(constituencyResults, validatorAddress) {
    const rollupContract = this.getContract('division', 'rollupBridge', true);
    
    const tx = await rollupContract.createRollupBatch(constituencyResults);
    const receipt = await tx.wait();
    
    return {
      batchId: receipt.logs[0].args.batchId.toString(),
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Sign rollup batch
   */
  async signRollupBatch(batchId, validatorAddress) {
    const rollupContract = this.getContract('division', 'rollupBridge', true);
    
    const tx = await rollupContract.signBatch(batchId);
    const receipt = await tx.wait();
    
    return {
      batchId,
      signer: validatorAddress,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get rollup batches
   */
  async getRollupBatches(limit = 10) {
    const rollupContract = this.getContract('division', 'rollupBridge');
    
    const batchCount = await rollupContract.getBatchCount();
    const batches = [];
    
    const start = Math.max(0, batchCount - limit);
    for (let i = start; i < batchCount; i++) {
      const batch = await rollupContract.getBatch(i);
      batches.push({
        id: i,
        aggregatedRoot: batch.aggregatedRoot,
        totalVotes: batch.totalVotes.toString(),
        signatureCount: batch.signatureCount.toString(),
        isFinalized: batch.isFinalized,
        timestamp: new Date(batch.timestamp * 1000).toISOString()
      });
    }
    
    return batches;
  }

  /**
   * Verify constituency result
   */
  async verifyConstituencyResult(constituencyId, proof, leaf, validatorAddress) {
    const rollupContract = this.getContract('division', 'rollupBridge');
    
    const isValid = await rollupContract.verifyConstituencyResult(
      constituencyId,
      proof,
      leaf
    );
    
    return isValid;
  }

  /**
   * Get division validators
   */
  async getDivisionValidators() {
    const rollupContract = this.getContract('division', 'rollupBridge');
    
    const validatorCount = await rollupContract.getValidatorCount();
    const validators = [];
    
    for (let i = 0; i < validatorCount; i++) {
      const validator = await rollupContract.getValidator(i);
      validators.push({
        address: validator.validatorAddress,
        isActive: validator.isActive,
        reputation: validator.reputation.toString()
      });
    }
    
    return validators;
  }

  /**
   * Check if address is division validator
   */
  async isDivisionValidator(address) {
    const rollupContract = this.getContract('division', 'rollupBridge');
    return await rollupContract.isValidator(address);
  }

  // ==================== NATIONAL TIER METHODS ====================

  /**
   * Get national contract addresses
   */
  async getNationalContracts() {
    return {
      nationalTally: this.contracts.national.nationalTally.address
    };
  }

  /**
   * Submit division result to national tally
   */
  async submitDivisionResult(divisionId, aggregatedRoot, totalVotes, candidateIds, candidateVotes, validatorAddress) {
    const nationalContract = this.getContract('national', 'nationalTally', true);
    
    const tx = await nationalContract.submitDivisionResult(
      divisionId,
      aggregatedRoot,
      totalVotes,
      candidateIds,
      candidateVotes
    );
    const receipt = await tx.wait();
    
    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get national election results
   */
  async getNationalResults() {
    const nationalContract = this.getContract('national', 'nationalTally');
    
    const results = await nationalContract.getFinalResults();
    return {
      totalVotes: results.totalVotes.toString(),
      candidateVotes: results.candidateVotes.map(v => v.toString()),
      isFinalized: results.isFinalized,
      finalizedAt: results.finalizedAt.toString()
    };
  }

  /**
   * Get all candidate results
   */
  async getAllCandidateResults() {
    const nationalContract = this.getContract('national', 'nationalTally');
    
    const candidateCount = await nationalContract.getCandidateCount();
    const candidates = [];
    
    for (let i = 0; i < candidateCount; i++) {
      const candidate = await nationalContract.getCandidate(i);
      candidates.push({
        id: i,
        name: candidate.name,
        totalVotes: candidate.totalVotes.toString(),
        percentage: candidate.percentage.toString()
      });
    }
    
    return candidates;
  }

  /**
   * Get specific candidate results
   */
  async getCandidateResults(candidateId) {
    const nationalContract = this.getContract('national', 'nationalTally');
    
    try {
      const candidate = await nationalContract.getCandidate(candidateId);
      return {
        id: candidateId,
        name: candidate.name,
        totalVotes: candidate.totalVotes.toString(),
        percentage: candidate.percentage.toString()
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Finalize national results
   */
  async finalizeNationalResult(validatorAddress) {
    const nationalContract = this.getContract('national', 'nationalTally', true);
    
    const tx = await nationalContract.finalizeResults();
    const receipt = await tx.wait();
    
    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      finalResultHash: receipt.logs[0].args.finalResultHash,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check if election is finalized
   */
  async isElectionFinalized() {
    const nationalContract = this.getContract('national', 'nationalTally');
    return await nationalContract.isFinalized();
  }

  /**
   * Check if all divisions have submitted results
   */
  async areAllDivisionsSubmitted() {
    const nationalContract = this.getContract('national', 'nationalTally');
    return await nationalContract.areAllDivisionsSubmitted();
  }

  /**
   * Check if address is national validator
   */
  async isNationalValidator(address) {
    const nationalContract = this.getContract('national', 'nationalTally');
    return await nationalContract.isValidator(address);
  }

  /**
   * Get audit trail from national contract
   */
  async getAuditTrail(options = {}) {
    const nationalContract = this.getContract('national', 'nationalTally');
    
    const { page = 1, limit = 50 } = options;
    const auditCount = await nationalContract.getAuditRecordCount();
    
    const start = Math.max(0, auditCount - (page * limit));
    const end = Math.min(auditCount, start + limit);
    
    const records = [];
    for (let i = start; i < end; i++) {
      const record = await nationalContract.getAuditRecord(i);
      records.push({
        id: i,
        action: record.action,
        actor: record.actor,
        dataHash: record.dataHash,
        timestamp: new Date(record.timestamp * 1000).toISOString()
      });
    }
    
    return {
      records,
      total: auditCount,
      page,
      limit
    };
  }

  /**
   * Get all division results
   */
  async getAllDivisionResults() {
    const nationalContract = this.getContract('national', 'nationalTally');
    
    const divisionCount = await nationalContract.getDivisionCount();
    const divisions = [];
    
    for (let i = 0; i < divisionCount; i++) {
      const division = await nationalContract.getDivisionResult(i);
      divisions.push({
        id: i,
        aggregatedRoot: division.aggregatedRoot,
        totalVotes: division.totalVotes.toString(),
        isSubmitted: division.isSubmitted,
        submittedAt: new Date(division.submittedAt * 1000).toISOString()
      });
    }
    
    return divisions;
  }

  /**
   * Get specific division result
   */
  async getDivisionResult(divisionId) {
    const nationalContract = this.getContract('national', 'nationalTally');
    
    try {
      const division = await nationalContract.getDivisionResult(divisionId);
      return {
        id: divisionId,
        aggregatedRoot: division.aggregatedRoot,
        totalVotes: division.totalVotes.toString(),
        isSubmitted: division.isSubmitted,
        submittedAt: new Date(division.submittedAt * 1000).toISOString()
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify division result
   */
  async verifyDivisionResult(divisionId, proof, leaf, validatorAddress) {
    const nationalContract = this.getContract('national', 'nationalTally');
    
    const isValid = await nationalContract.verifyDivisionResult(
      divisionId,
      proof,
      leaf
    );
    
    return isValid;
  }

  /**
   * Get national statistics
   */
  async getNationalStats() {
    const nationalContract = this.getContract('national', 'nationalTally');
    
    const stats = await nationalContract.getStatistics();
    return {
      totalVotes: stats.totalVotes.toString(),
      totalDivisions: stats.totalDivisions.toString(),
      submittedDivisions: stats.submittedDivisions.toString(),
      totalCandidates: stats.totalCandidates.toString(),
      isFinalized: stats.isFinalized
    };
  }

  /**
   * Export complete election data
   */
  async exportElectionData() {
    const nationalResults = await this.getNationalResults();
    const candidates = await this.getAllCandidateResults();
    const divisions = await this.getAllDivisionResults();
    const auditTrail = await this.getAuditTrail({ limit: 1000 });
    
    return {
      nationalResults,
      candidates,
      divisions,
      auditTrail: auditTrail.records,
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Get transaction details
   */
  async getTransactionDetails(transactionHash) {
    // Try to get transaction from all providers
    for (const [tier, provider] of Object.entries(this.providers)) {
      try {
        const tx = await provider.getTransaction(transactionHash);
        if (tx) {
          const receipt = await provider.getTransactionReceipt(transactionHash);
          return {
            tier,
            transaction: tx,
            receipt,
            gasUsed: receipt?.gasUsed?.toString(),
            status: receipt?.status
          };
        }
      } catch (error) {
        // Continue to next provider
      }
    }
    
    return null;
  }

  /**
   * Get current gas usage for energy calculations
   */
  async getCurrentGasUsage() {
    // This is a simplified implementation
    // In a real system, you would track gas usage more precisely
    try {
      const latestBlock = await this.providers.constituency.getBlock('latest');
      return latestBlock.gasUsed || 0;
    } catch (error) {
      console.warn('Failed to get current gas usage:', error);
      return 0;
    }
  }
}

module.exports = BlockchainService;