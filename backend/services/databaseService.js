const fs = require('fs').promises;
const path = require('path');
const { ethers } = require('ethers');

class DatabaseService {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.collections = {
      votes: [],
      voters: [],
      candidates: [],
      validators: [],
      rollupBatches: [],
      divisionResults: [],
      auditRecords: [],
      energyRecords: [],
      finalizationRecords: []
    };
    this.initialized = false;
  }

  /**
   * Initialize database service
   */
  async initialize() {
    try {
      // Create data directory if it doesn't exist
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Load existing data
      await this.loadAllCollections();
      
      this.initialized = true;
      console.log('DatabaseService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize DatabaseService:', error);
      throw error;
    }
  }

  /**
   * Load all collections from files
   */
  async loadAllCollections() {
    for (const [collectionName] of Object.entries(this.collections)) {
      await this.loadCollection(collectionName);
    }
  }

  /**
   * Load a specific collection from file
   */
  async loadCollection(collectionName) {
    try {
      const filePath = path.join(this.dataDir, `${collectionName}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      this.collections[collectionName] = JSON.parse(data).map(record => ({
        ...record,
        // Convert date strings back to Date objects
        timestamp: record.timestamp ? new Date(record.timestamp) : undefined,
        createdAt: record.createdAt ? new Date(record.createdAt) : undefined,
        updatedAt: record.updatedAt ? new Date(record.updatedAt) : undefined
      }));
      console.log(`Loaded ${this.collections[collectionName].length} records from ${collectionName}`);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty array
      this.collections[collectionName] = [];
      console.log(`Initialized empty collection: ${collectionName}`);
    }
  }

  /**
   * Save a collection to file
   */
  async saveCollection(collectionName) {
    try {
      const filePath = path.join(this.dataDir, `${collectionName}.json`);
      await fs.writeFile(filePath, JSON.stringify(this.collections[collectionName], null, 2));
    } catch (error) {
      console.error(`Failed to save collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // ==================== VOTE OPERATIONS ====================

  /**
   * Store a vote record
   */
  async storeVote(voteData) {
    const vote = {
      id: this.generateId(),
      voterAddress: voteData.voterAddress,
      candidateId: voteData.candidateId,
      constituencyId: voteData.constituencyId || 'default',
      transactionHash: voteData.transactionHash,
      blockNumber: voteData.blockNumber,
      gasUsed: voteData.gasUsed || 0,
      merkleProof: voteData.merkleProof || [],
      verified: voteData.verified || false,
      timestamp: voteData.timestamp || new Date(),
      createdAt: new Date()
    };

    this.collections.votes.push(vote);
    await this.saveCollection('votes');
    return vote.id;
  }

  /**
   * Get vote by ID
   */
  async getVote(voteId) {
    return this.collections.votes.find(vote => vote.id === voteId);
  }

  /**
   * Get votes by voter address
   */
  async getVotesByVoter(voterAddress) {
    return this.collections.votes.filter(vote => 
      vote.voterAddress.toLowerCase() === voterAddress.toLowerCase()
    );
  }

  /**
   * Get votes by candidate
   */
  async getVotesByCandidate(candidateId) {
    return this.collections.votes.filter(vote => vote.candidateId === candidateId);
  }

  /**
   * Get votes by constituency
   */
  async getVotesByConstituency(constituencyId) {
    return this.collections.votes.filter(vote => vote.constituencyId === constituencyId);
  }

  /**
   * Verify vote exists
   */
  async verifyVoteExists(voterAddress, candidateId) {
    return this.collections.votes.some(vote => 
      vote.voterAddress.toLowerCase() === voterAddress.toLowerCase() && 
      vote.candidateId === candidateId
    );
  }

  // ==================== VOTER OPERATIONS ====================

  /**
   * Store voter information
   */
  async storeVoter(voterData) {
    const voter = {
      id: this.generateId(),
      address: voterData.address,
      constituencyId: voterData.constituencyId || 'default',
      isEligible: voterData.isEligible !== undefined ? voterData.isEligible : true,
      hasVoted: voterData.hasVoted || false,
      registrationHash: voterData.registrationHash || null,
      metadata: voterData.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Check if voter already exists
    const existingVoterIndex = this.collections.voters.findIndex(v => 
      v.address.toLowerCase() === voter.address.toLowerCase()
    );

    if (existingVoterIndex >= 0) {
      // Update existing voter
      this.collections.voters[existingVoterIndex] = {
        ...this.collections.voters[existingVoterIndex],
        ...voter,
        id: this.collections.voters[existingVoterIndex].id,
        createdAt: this.collections.voters[existingVoterIndex].createdAt
      };
    } else {
      // Add new voter
      this.collections.voters.push(voter);
    }

    await this.saveCollection('voters');
    return voter.id;
  }

  /**
   * Get voter by address
   */
  async getVoter(voterAddress) {
    return this.collections.voters.find(voter => 
      voter.address.toLowerCase() === voterAddress.toLowerCase()
    );
  }

  /**
   * Update voter voting status
   */
  async updateVoterStatus(voterAddress, hasVoted = true) {
    const voterIndex = this.collections.voters.findIndex(voter => 
      voter.address.toLowerCase() === voterAddress.toLowerCase()
    );

    if (voterIndex >= 0) {
      this.collections.voters[voterIndex].hasVoted = hasVoted;
      this.collections.voters[voterIndex].updatedAt = new Date();
      await this.saveCollection('voters');
      return true;
    }
    return false;
  }

  /**
   * Get voters by constituency
   */
  async getVotersByConstituency(constituencyId) {
    return this.collections.voters.filter(voter => voter.constituencyId === constituencyId);
  }

  // ==================== CANDIDATE OPERATIONS ====================

  /**
   * Store candidate information
   */
  async storeCandidate(candidateData) {
    const candidate = {
      id: candidateData.id || this.generateId(),
      name: candidateData.name,
      party: candidateData.party || '',
      constituencyId: candidateData.constituencyId || 'default',
      isActive: candidateData.isActive !== undefined ? candidateData.isActive : true,
      voteCount: candidateData.voteCount || 0,
      metadata: candidateData.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Check if candidate already exists
    const existingCandidateIndex = this.collections.candidates.findIndex(c => 
      c.id === candidate.id || (c.name === candidate.name && c.constituencyId === candidate.constituencyId)
    );

    if (existingCandidateIndex >= 0) {
      // Update existing candidate
      this.collections.candidates[existingCandidateIndex] = {
        ...this.collections.candidates[existingCandidateIndex],
        ...candidate,
        createdAt: this.collections.candidates[existingCandidateIndex].createdAt
      };
    } else {
      // Add new candidate
      this.collections.candidates.push(candidate);
    }

    await this.saveCollection('candidates');
    return candidate.id;
  }

  /**
   * Get candidate by ID
   */
  async getCandidate(candidateId) {
    return this.collections.candidates.find(candidate => candidate.id === candidateId);
  }

  /**
   * Get candidates by constituency
   */
  async getCandidatesByConstituency(constituencyId) {
    return this.collections.candidates.filter(candidate => 
      candidate.constituencyId === constituencyId && candidate.isActive
    );
  }

  /**
   * Update candidate vote count
   */
  async updateCandidateVoteCount(candidateId, voteCount) {
    const candidateIndex = this.collections.candidates.findIndex(candidate => 
      candidate.id === candidateId
    );

    if (candidateIndex >= 0) {
      this.collections.candidates[candidateIndex].voteCount = voteCount;
      this.collections.candidates[candidateIndex].updatedAt = new Date();
      await this.saveCollection('candidates');
      return true;
    }
    return false;
  }

  // ==================== VALIDATOR OPERATIONS ====================

  /**
   * Store validator information
   */
  async storeValidator(validatorData) {
    const validator = {
      id: this.generateId(),
      address: validatorData.address,
      tier: validatorData.tier, // constituency, division, national
      stake: validatorData.stake || '0',
      isActive: validatorData.isActive !== undefined ? validatorData.isActive : true,
      reputation: validatorData.reputation || '100',
      lastActivity: validatorData.lastActivity || new Date(),
      metadata: validatorData.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Check if validator already exists
    const existingValidatorIndex = this.collections.validators.findIndex(v => 
      v.address.toLowerCase() === validator.address.toLowerCase() && v.tier === validator.tier
    );

    if (existingValidatorIndex >= 0) {
      // Update existing validator
      this.collections.validators[existingValidatorIndex] = {
        ...this.collections.validators[existingValidatorIndex],
        ...validator,
        id: this.collections.validators[existingValidatorIndex].id,
        createdAt: this.collections.validators[existingValidatorIndex].createdAt
      };
    } else {
      // Add new validator
      this.collections.validators.push(validator);
    }

    await this.saveCollection('validators');
    return validator.id;
  }

  /**
   * Get validator by address and tier
   */
  async getValidator(validatorAddress, tier) {
    return this.collections.validators.find(validator => 
      validator.address.toLowerCase() === validatorAddress.toLowerCase() && 
      validator.tier === tier
    );
  }

  /**
   * Get validators by tier
   */
  async getValidatorsByTier(tier) {
    return this.collections.validators.filter(validator => 
      validator.tier === tier && validator.isActive
    );
  }

  // ==================== ROLLUP BATCH OPERATIONS ====================

  /**
   * Store rollup batch
   */
  async storeRollupBatch(batchData) {
    const batch = {
      id: batchData.id || this.generateId(),
      batchId: batchData.batchId,
      aggregatedRoot: batchData.aggregatedRoot,
      totalVotes: batchData.totalVotes || 0,
      constituencyResults: batchData.constituencyResults || [],
      signatures: batchData.signatures || [],
      isFinalized: batchData.isFinalized || false,
      transactionHash: batchData.transactionHash || null,
      blockNumber: batchData.blockNumber || null,
      gasUsed: batchData.gasUsed || 0,
      creator: batchData.creator,
      timestamp: batchData.timestamp || new Date(),
      createdAt: new Date()
    };

    this.collections.rollupBatches.push(batch);
    await this.saveCollection('rollupBatches');
    return batch.id;
  }

  /**
   * Get rollup batch by ID
   */
  async getRollupBatch(batchId) {
    return this.collections.rollupBatches.find(batch => 
      batch.id === batchId || batch.batchId === batchId
    );
  }

  /**
   * Get recent rollup batches
   */
  async getRecentRollupBatches(limit = 10) {
    return this.collections.rollupBatches
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Update rollup batch signatures
   */
  async updateRollupBatchSignatures(batchId, signatures) {
    const batchIndex = this.collections.rollupBatches.findIndex(batch => 
      batch.id === batchId || batch.batchId === batchId
    );

    if (batchIndex >= 0) {
      this.collections.rollupBatches[batchIndex].signatures = signatures;
      this.collections.rollupBatches[batchIndex].updatedAt = new Date();
      await this.saveCollection('rollupBatches');
      return true;
    }
    return false;
  }

  // ==================== DIVISION RESULT OPERATIONS ====================

  /**
   * Store division result
   */
  async storeDivisionResult(resultData) {
    const result = {
      id: this.generateId(),
      divisionId: resultData.divisionId,
      aggregatedRoot: resultData.aggregatedRoot,
      totalVotes: resultData.totalVotes || 0,
      candidateVotes: resultData.candidateVotes,
      transactionHash: resultData.transactionHash || null,
      blockNumber: resultData.blockNumber || null,
      gasUsed: resultData.gasUsed || 0,
      submitter: resultData.submitter,
      timestamp: resultData.timestamp || new Date(),
      createdAt: new Date()
    };

    this.collections.divisionResults.push(result);
    await this.saveCollection('divisionResults');
    return result.id;
  }

  /**
   * Get division result by division ID
   */
  async getDivisionResult(divisionId) {
    return this.collections.divisionResults.find(result => 
      result.divisionId === divisionId
    );
  }

  /**
   * Get all division results
   */
  async getAllDivisionResults() {
    return this.collections.divisionResults.sort((a, b) => b.timestamp - a.timestamp);
  }

  // ==================== FINALIZATION OPERATIONS ====================

  /**
   * Store finalization record
   */
  async storeFinalizationRecord(recordData) {
    const record = {
      id: this.generateId(),
      finalizer: recordData.finalizer,
      transactionHash: recordData.transactionHash,
      blockNumber: recordData.blockNumber,
      gasUsed: recordData.gasUsed || 0,
      finalResultHash: recordData.finalResultHash || null,
      timestamp: recordData.timestamp || new Date(),
      createdAt: new Date()
    };

    this.collections.finalizationRecords.push(record);
    await this.saveCollection('finalizationRecords');
    return record.id;
  }

  /**
   * Get finalization records
   */
  async getFinalizationRecords() {
    return this.collections.finalizationRecords.sort((a, b) => b.timestamp - a.timestamp);
  }

  // ==================== AUDIT OPERATIONS ====================

  /**
   * Store audit record
   */
  async storeAuditRecord(auditData) {
    const record = {
      id: this.generateId(),
      action: auditData.action,
      tier: auditData.tier || 'unknown',
      actor: auditData.actor,
      dataHash: auditData.dataHash || null,
      transactionHash: auditData.transactionHash || null,
      blockNumber: auditData.blockNumber || null,
      metadata: auditData.metadata || {},
      description: auditData.description || '',
      timestamp: auditData.timestamp || new Date(),
      createdAt: new Date()
    };

    this.collections.auditRecords.push(record);
    await this.saveCollection('auditRecords');
    return record.id;
  }

  /**
   * Get audit records with filtering
   */
  async getAuditRecords(filters = {}, pagination = {}) {
    let records = [...this.collections.auditRecords];

    // Apply filters
    if (filters.tier) {
      records = records.filter(record => record.tier === filters.tier);
    }
    if (filters.action) {
      records = records.filter(record => record.action === filters.action);
    }
    if (filters.actor) {
      records = records.filter(record => 
        record.actor.toLowerCase() === filters.actor.toLowerCase()
      );
    }
    if (filters.startDate) {
      records = records.filter(record => record.timestamp >= filters.startDate);
    }
    if (filters.endDate) {
      records = records.filter(record => record.timestamp <= filters.endDate);
    }
    if (filters.transactionHash) {
      records = records.filter(record => record.transactionHash === filters.transactionHash);
    }

    // Sort by timestamp (newest first)
    records.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const { page = 1, limit = 50 } = pagination;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRecords = records.slice(startIndex, endIndex);

    return {
      records: paginatedRecords,
      total: records.length,
      page,
      limit
    };
  }

  /**
   * Get audit record by ID
   */
  async getAuditRecord(recordId) {
    return this.collections.auditRecords.find(record => record.id === recordId);
  }

  // ==================== ENERGY OPERATIONS ====================

  /**
   * Store energy record
   */
  async storeEnergyRecord(energyData) {
    const record = {
      id: this.generateId(),
      tier: energyData.tier,
      operation: energyData.operation,
      gasUsed: energyData.gasUsed || 0,
      energyConsumed: energyData.energyConsumed || 0,
      transactionHash: energyData.transactionHash || null,
      metadata: energyData.metadata || {},
      timestamp: energyData.timestamp || new Date(),
      createdAt: new Date()
    };

    this.collections.energyRecords.push(record);
    await this.saveCollection('energyRecords');
    return record.id;
  }

  /**
   * Get energy records with filtering
   */
  async getEnergyRecords(filters = {}, pagination = {}) {
    let records = [...this.collections.energyRecords];

    // Apply filters
    if (filters.tier) {
      records = records.filter(record => record.tier === filters.tier);
    }
    if (filters.operation) {
      records = records.filter(record => record.operation === filters.operation);
    }
    if (filters.startDate) {
      records = records.filter(record => record.timestamp >= filters.startDate);
    }
    if (filters.endDate) {
      records = records.filter(record => record.timestamp <= filters.endDate);
    }

    // Sort by timestamp (newest first)
    records.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const { page = 1, limit = 100 } = pagination;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRecords = records.slice(startIndex, endIndex);

    return {
      records: paginatedRecords,
      total: records.length,
      page,
      limit
    };
  }

  // ==================== STATISTICS OPERATIONS ====================

  /**
   * Get voting statistics
   */
  async getVotingStats() {
    const totalVotes = this.collections.votes.length;
    const totalVoters = this.collections.voters.length;
    const votersWhoVoted = this.collections.voters.filter(voter => voter.hasVoted).length;
    const totalCandidates = this.collections.candidates.length;
    const activeCandidates = this.collections.candidates.filter(candidate => candidate.isActive).length;

    return {
      totalVotes,
      totalVoters,
      votersWhoVoted,
      turnoutPercentage: totalVoters > 0 ? (votersWhoVoted / totalVoters) * 100 : 0,
      totalCandidates,
      activeCandidates
    };
  }

  /**
   * Get system statistics
   */
  async getSystemStats() {
    const votingStats = await this.getVotingStats();
    const totalValidators = this.collections.validators.length;
    const activeValidators = this.collections.validators.filter(validator => validator.isActive).length;
    const totalRollupBatches = this.collections.rollupBatches.length;
    const finalizedBatches = this.collections.rollupBatches.filter(batch => batch.isFinalized).length;
    const totalAuditRecords = this.collections.auditRecords.length;
    const totalEnergyRecords = this.collections.energyRecords.length;

    return {
      ...votingStats,
      totalValidators,
      activeValidators,
      totalRollupBatches,
      finalizedBatches,
      totalAuditRecords,
      totalEnergyRecords,
      lastUpdated: new Date().toISOString()
    };
  }

  // ==================== UTILITY OPERATIONS ====================

  /**
   * Backup all data
   */
  async backupData() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.dataDir, 'backups', timestamp);
    
    await fs.mkdir(backupDir, { recursive: true });
    
    for (const [collectionName, data] of Object.entries(this.collections)) {
      const backupPath = path.join(backupDir, `${collectionName}.json`);
      await fs.writeFile(backupPath, JSON.stringify(data, null, 2));
    }
    
    return backupDir;
  }

  /**
   * Clear all data (use with caution)
   */
  async clearAllData() {
    for (const collectionName of Object.keys(this.collections)) {
      this.collections[collectionName] = [];
      await this.saveCollection(collectionName);
    }
  }

  /**
   * Get collection size
   */
  getCollectionSize(collectionName) {
    return this.collections[collectionName]?.length || 0;
  }

  /**
   * Check if database is healthy
   */
  async healthCheck() {
    try {
      // Check if data directory exists and is writable
      await fs.access(this.dataDir, fs.constants.W_OK);
      
      // Check if all collections are loaded
      const collectionsLoaded = Object.keys(this.collections).length > 0;
      
      return {
        healthy: true,
        initialized: this.initialized,
        collectionsLoaded,
        dataDirectory: this.dataDir,
        collections: Object.keys(this.collections).map(name => ({
          name,
          size: this.getCollectionSize(name)
        }))
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        initialized: this.initialized
      };
    }
  }
}

module.exports = DatabaseService;