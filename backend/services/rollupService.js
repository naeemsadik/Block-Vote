const { ethers } = require('ethers');
const crypto = require('crypto');

class RollupService {
  constructor(blockchainService, databaseService, energyService) {
    this.blockchainService = blockchainService;
    this.databaseService = databaseService;
    this.energyService = energyService;
    this.pendingBatches = new Map();
    this.batchInterval = 300000; // 5 minutes in milliseconds
    this.maxBatchSize = 100; // Maximum number of constituency results per batch
    this.initialized = false;
  }

  /**
   * Initialize rollup service
   */
  async initialize() {
    try {
      if (!this.blockchainService.initialized) {
        await this.blockchainService.initialize();
      }
      
      this.initialized = true;
      console.log('RollupService initialized successfully');
      
      // Start automatic batch processing
      this.startBatchProcessor();
    } catch (error) {
      console.error('Failed to initialize RollupService:', error);
      throw error;
    }
  }

  /**
   * Start automatic batch processing
   */
  startBatchProcessor() {
    setInterval(async () => {
      try {
        await this.processAutomaticBatch();
      } catch (error) {
        console.error('Error in automatic batch processing:', error);
      }
    }, this.batchInterval);
    
    console.log(`Automatic batch processing started with ${this.batchInterval / 1000}s interval`);
  }

  /**
   * Submit constituency result for rollup
   */
  async submitConstituencyResult(constituencyData) {
    try {
      const startTime = Date.now();
      
      // Validate constituency data
      this.validateConstituencyData(constituencyData);
      
      // Create constituency result record
      const constituencyResult = {
        constituencyId: constituencyData.constituencyId,
        merkleRoot: constituencyData.merkleRoot,
        totalVotes: constituencyData.totalVotes,
        candidateVotes: constituencyData.candidateVotes,
        timestamp: new Date(),
        submitter: constituencyData.submitter,
        verified: false
      };
      
      // Store in database
      const resultId = await this.databaseService.storeConstituencyResult(constituencyResult);
      
      // Add to pending batch
      await this.addToPendingBatch(constituencyResult);
      
      // Track energy consumption
      const energyUsed = this.calculateEnergyUsage('submit_constituency', Date.now() - startTime);
      await this.energyService.recordEnergyConsumption({
        tier: 'division',
        operation: 'submit_constituency_result',
        energyConsumed: energyUsed,
        metadata: {
          constituencyId: constituencyData.constituencyId,
          totalVotes: constituencyData.totalVotes
        }
      });
      
      return {
        success: true,
        resultId,
        constituencyId: constituencyData.constituencyId,
        addedToBatch: true
      };
    } catch (error) {
      console.error('Error submitting constituency result:', error);
      throw error;
    }
  }

  /**
   * Validate constituency data
   */
  validateConstituencyData(data) {
    const required = ['constituencyId', 'merkleRoot', 'totalVotes', 'candidateVotes', 'submitter'];
    
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Validate merkle root format
    if (!ethers.utils.isHexString(data.merkleRoot, 32)) {
      throw new Error('Invalid merkle root format');
    }
    
    // Validate total votes
    if (typeof data.totalVotes !== 'number' || data.totalVotes < 0) {
      throw new Error('Invalid total votes count');
    }
    
    // Validate candidate votes
    if (!Array.isArray(data.candidateVotes)) {
      throw new Error('Candidate votes must be an array');
    }
    
    // Validate submitter address
    if (!ethers.utils.isAddress(data.submitter)) {
      throw new Error('Invalid submitter address');
    }
  }

  /**
   * Add constituency result to pending batch
   */
  async addToPendingBatch(constituencyResult) {
    const batchId = this.getCurrentBatchId();
    
    if (!this.pendingBatches.has(batchId)) {
      this.pendingBatches.set(batchId, {
        id: batchId,
        constituencyResults: [],
        createdAt: new Date(),
        status: 'pending'
      });
    }
    
    const batch = this.pendingBatches.get(batchId);
    batch.constituencyResults.push(constituencyResult);
    
    // Auto-process if batch is full
    if (batch.constituencyResults.length >= this.maxBatchSize) {
      await this.processBatch(batchId);
    }
  }

  /**
   * Get current batch ID based on time window
   */
  getCurrentBatchId() {
    const now = Date.now();
    const batchWindow = Math.floor(now / this.batchInterval);
    return `batch_${batchWindow}`;
  }

  /**
   * Process automatic batch
   */
  async processAutomaticBatch() {
    const currentBatchId = this.getCurrentBatchId();
    
    // Process all batches except the current one
    for (const [batchId, batch] of this.pendingBatches.entries()) {
      if (batchId !== currentBatchId && batch.status === 'pending') {
        await this.processBatch(batchId);
      }
    }
  }

  /**
   * Process a specific batch
   */
  async processBatch(batchId) {
    try {
      const batch = this.pendingBatches.get(batchId);
      if (!batch || batch.status !== 'pending') {
        return null;
      }
      
      if (batch.constituencyResults.length === 0) {
        console.log(`Batch ${batchId} is empty, skipping`);
        this.pendingBatches.delete(batchId);
        return null;
      }
      
      console.log(`Processing batch ${batchId} with ${batch.constituencyResults.length} constituency results`);
      
      const startTime = Date.now();
      batch.status = 'processing';
      
      // Create aggregated merkle root
      const aggregatedRoot = this.createAggregatedMerkleRoot(batch.constituencyResults);
      
      // Calculate total votes
      const totalVotes = batch.constituencyResults.reduce((sum, result) => sum + result.totalVotes, 0);
      
      // Create rollup batch data
      const rollupBatch = {
        batchId,
        aggregatedRoot,
        totalVotes,
        constituencyResults: batch.constituencyResults.map(result => ({
          constituencyId: result.constituencyId,
          merkleRoot: result.merkleRoot,
          totalVotes: result.totalVotes,
          candidateVotes: result.candidateVotes
        })),
        signatures: [],
        isFinalized: false,
        creator: await this.blockchainService.getSignerAddress(),
        timestamp: new Date()
      };
      
      // Store in database
      const storedBatchId = await this.databaseService.storeRollupBatch(rollupBatch);
      
      // Submit to blockchain (if connected)
      let transactionHash = null;
      let blockNumber = null;
      let gasUsed = 0;
      
      try {
        if (this.blockchainService.divisionContract) {
          const tx = await this.blockchainService.submitRollupBatch(
            batchId,
            aggregatedRoot,
            totalVotes,
            batch.constituencyResults
          );
          
          const receipt = await tx.wait();
          transactionHash = receipt.transactionHash;
          blockNumber = receipt.blockNumber;
          gasUsed = receipt.gasUsed.toNumber();
          
          // Update batch with transaction info
          rollupBatch.transactionHash = transactionHash;
          rollupBatch.blockNumber = blockNumber;
          rollupBatch.gasUsed = gasUsed;
          
          await this.databaseService.updateRollupBatch(storedBatchId, {
            transactionHash,
            blockNumber,
            gasUsed
          });
        }
      } catch (blockchainError) {
        console.error('Blockchain submission failed, batch stored locally:', blockchainError);
      }
      
      // Track energy consumption
      const processingTime = Date.now() - startTime;
      const energyUsed = this.calculateEnergyUsage('process_batch', processingTime, gasUsed);
      await this.energyService.recordEnergyConsumption({
        tier: 'division',
        operation: 'process_rollup_batch',
        gasUsed,
        energyConsumed: energyUsed,
        transactionHash,
        metadata: {
          batchId,
          constituencyCount: batch.constituencyResults.length,
          totalVotes,
          processingTimeMs: processingTime
        }
      });
      
      // Mark batch as processed
      batch.status = 'processed';
      batch.processedAt = new Date();
      batch.storedBatchId = storedBatchId;
      
      console.log(`Batch ${batchId} processed successfully. Transaction: ${transactionHash}`);
      
      return {
        batchId,
        storedBatchId,
        aggregatedRoot,
        totalVotes,
        constituencyCount: batch.constituencyResults.length,
        transactionHash,
        blockNumber,
        gasUsed,
        energyUsed
      };
    } catch (error) {
      console.error(`Error processing batch ${batchId}:`, error);
      
      // Mark batch as failed
      const batch = this.pendingBatches.get(batchId);
      if (batch) {
        batch.status = 'failed';
        batch.error = error.message;
        batch.failedAt = new Date();
      }
      
      throw error;
    }
  }

  /**
   * Create aggregated merkle root from constituency results
   */
  createAggregatedMerkleRoot(constituencyResults) {
    // Sort constituency results by ID for deterministic ordering
    const sortedResults = constituencyResults.sort((a, b) => 
      a.constituencyId.localeCompare(b.constituencyId)
    );
    
    // Create leaves from constituency merkle roots
    const leaves = sortedResults.map(result => result.merkleRoot);
    
    if (leaves.length === 0) {
      return ethers.constants.HashZero;
    }
    
    if (leaves.length === 1) {
      return leaves[0];
    }
    
    // Build merkle tree
    return this.buildMerkleTree(leaves);
  }

  /**
   * Build merkle tree from leaves
   */
  buildMerkleTree(leaves) {
    if (leaves.length === 0) {
      return ethers.constants.HashZero;
    }
    
    if (leaves.length === 1) {
      return leaves[0];
    }
    
    const nextLevel = [];
    
    for (let i = 0; i < leaves.length; i += 2) {
      const left = leaves[i];
      const right = i + 1 < leaves.length ? leaves[i + 1] : left;
      
      const combined = ethers.utils.solidityKeccak256(
        ['bytes32', 'bytes32'],
        [left, right]
      );
      
      nextLevel.push(combined);
    }
    
    return this.buildMerkleTree(nextLevel);
  }

  /**
   * Sign rollup batch
   */
  async signRollupBatch(batchId, signerAddress) {
    try {
      const startTime = Date.now();
      
      // Get batch from database
      const batch = await this.databaseService.getRollupBatch(batchId);
      if (!batch) {
        throw new Error('Batch not found');
      }
      
      // Verify signer is authorized validator
      const validator = await this.databaseService.getValidator(signerAddress, 'division');
      if (!validator || !validator.isActive) {
        throw new Error('Unauthorized validator');
      }
      
      // Create signature data
      const messageHash = this.createBatchMessageHash(batch);
      
      let signature = null;
      let gasUsed = 0;
      
      // Sign with blockchain service if available
      try {
        if (this.blockchainService.divisionContract) {
          const tx = await this.blockchainService.signRollupBatch(batchId, messageHash);
          const receipt = await tx.wait();
          gasUsed = receipt.gasUsed.toNumber();
          
          // Get signature from transaction logs or create manually
          signature = await this.blockchainService.signer.signMessage(
            ethers.utils.arrayify(messageHash)
          );
        } else {
          // Create signature manually for testing
          signature = await this.createTestSignature(messageHash, signerAddress);
        }
      } catch (blockchainError) {
        console.error('Blockchain signing failed, creating local signature:', blockchainError);
        signature = await this.createTestSignature(messageHash, signerAddress);
      }
      
      // Add signature to batch
      const signatureData = {
        validator: signerAddress,
        signature,
        messageHash,
        timestamp: new Date()
      };
      
      // Update batch signatures
      const currentSignatures = batch.signatures || [];
      const existingSignatureIndex = currentSignatures.findIndex(sig => 
        sig.validator.toLowerCase() === signerAddress.toLowerCase()
      );
      
      if (existingSignatureIndex >= 0) {
        currentSignatures[existingSignatureIndex] = signatureData;
      } else {
        currentSignatures.push(signatureData);
      }
      
      await this.databaseService.updateRollupBatchSignatures(batchId, currentSignatures);
      
      // Track energy consumption
      const energyUsed = this.calculateEnergyUsage('sign_batch', Date.now() - startTime, gasUsed);
      await this.energyService.recordEnergyConsumption({
        tier: 'division',
        operation: 'sign_rollup_batch',
        gasUsed,
        energyConsumed: energyUsed,
        metadata: {
          batchId,
          validator: signerAddress,
          signatureCount: currentSignatures.length
        }
      });
      
      return {
        success: true,
        batchId,
        validator: signerAddress,
        signature,
        messageHash,
        totalSignatures: currentSignatures.length
      };
    } catch (error) {
      console.error('Error signing rollup batch:', error);
      throw error;
    }
  }

  /**
   * Create message hash for batch signing
   */
  createBatchMessageHash(batch) {
    const messageData = {
      batchId: batch.batchId,
      aggregatedRoot: batch.aggregatedRoot,
      totalVotes: batch.totalVotes,
      timestamp: batch.timestamp.getTime()
    };
    
    return ethers.utils.solidityKeccak256(
      ['string', 'bytes32', 'uint256', 'uint256'],
      [messageData.batchId, messageData.aggregatedRoot, messageData.totalVotes, messageData.timestamp]
    );
  }

  /**
   * Create test signature for development
   */
  async createTestSignature(messageHash, signerAddress) {
    // Create a deterministic signature for testing
    const privateKey = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(signerAddress + 'test_key')
    );
    
    const wallet = new ethers.Wallet(privateKey);
    return await wallet.signMessage(ethers.utils.arrayify(messageHash));
  }

  /**
   * Verify constituency result
   */
  async verifyConstituencyResult(constituencyId, merkleRoot, proof) {
    try {
      const startTime = Date.now();
      
      // Get constituency result from database
      const constituencyResult = await this.databaseService.getConstituencyResult(constituencyId);
      if (!constituencyResult) {
        throw new Error('Constituency result not found');
      }
      
      // Verify merkle proof
      const isValid = this.verifyMerkleProof(merkleRoot, proof, constituencyResult.merkleRoot);
      
      // Track energy consumption
      const energyUsed = this.calculateEnergyUsage('verify_result', Date.now() - startTime);
      await this.energyService.recordEnergyConsumption({
        tier: 'division',
        operation: 'verify_constituency_result',
        energyConsumed: energyUsed,
        metadata: {
          constituencyId,
          verified: isValid
        }
      });
      
      return {
        valid: isValid,
        constituencyId,
        merkleRoot: constituencyResult.merkleRoot,
        totalVotes: constituencyResult.totalVotes
      };
    } catch (error) {
      console.error('Error verifying constituency result:', error);
      throw error;
    }
  }

  /**
   * Verify merkle proof
   */
  verifyMerkleProof(root, proof, leaf) {
    let computedHash = leaf;
    
    for (const proofElement of proof) {
      if (computedHash <= proofElement) {
        computedHash = ethers.utils.solidityKeccak256(
          ['bytes32', 'bytes32'],
          [computedHash, proofElement]
        );
      } else {
        computedHash = ethers.utils.solidityKeccak256(
          ['bytes32', 'bytes32'],
          [proofElement, computedHash]
        );
      }
    }
    
    return computedHash === root;
  }

  /**
   * Get rollup batch status
   */
  async getRollupBatchStatus(batchId) {
    try {
      // Check pending batches first
      const pendingBatch = this.pendingBatches.get(batchId);
      if (pendingBatch) {
        return {
          batchId,
          status: pendingBatch.status,
          constituencyCount: pendingBatch.constituencyResults.length,
          createdAt: pendingBatch.createdAt,
          processedAt: pendingBatch.processedAt,
          error: pendingBatch.error
        };
      }
      
      // Check database
      const storedBatch = await this.databaseService.getRollupBatch(batchId);
      if (storedBatch) {
        return {
          batchId: storedBatch.batchId,
          status: storedBatch.isFinalized ? 'finalized' : 'stored',
          aggregatedRoot: storedBatch.aggregatedRoot,
          totalVotes: storedBatch.totalVotes,
          constituencyCount: storedBatch.constituencyResults.length,
          signatures: storedBatch.signatures.length,
          transactionHash: storedBatch.transactionHash,
          blockNumber: storedBatch.blockNumber,
          createdAt: storedBatch.createdAt
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting rollup batch status:', error);
      throw error;
    }
  }

  /**
   * Get recent rollup batches
   */
  async getRecentRollupBatches(limit = 10) {
    try {
      const storedBatches = await this.databaseService.getRecentRollupBatches(limit);
      
      return storedBatches.map(batch => ({
        batchId: batch.batchId,
        aggregatedRoot: batch.aggregatedRoot,
        totalVotes: batch.totalVotes,
        constituencyCount: batch.constituencyResults.length,
        signatures: batch.signatures.length,
        isFinalized: batch.isFinalized,
        transactionHash: batch.transactionHash,
        blockNumber: batch.blockNumber,
        gasUsed: batch.gasUsed,
        timestamp: batch.timestamp
      }));
    } catch (error) {
      console.error('Error getting recent rollup batches:', error);
      throw error;
    }
  }

  /**
   * Get rollup statistics
   */
  async getRollupStats() {
    try {
      const recentBatches = await this.databaseService.getRecentRollupBatches(100);
      
      const totalBatches = recentBatches.length;
      const finalizedBatches = recentBatches.filter(batch => batch.isFinalized).length;
      const totalVotes = recentBatches.reduce((sum, batch) => sum + batch.totalVotes, 0);
      const totalConstituencies = recentBatches.reduce((sum, batch) => 
        sum + batch.constituencyResults.length, 0
      );
      
      const avgVotesPerBatch = totalBatches > 0 ? totalVotes / totalBatches : 0;
      const avgConstituenciesPerBatch = totalBatches > 0 ? totalConstituencies / totalBatches : 0;
      
      // Calculate processing efficiency
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentBatches24h = recentBatches.filter(batch => 
        batch.timestamp >= last24Hours
      );
      
      return {
        totalBatches,
        finalizedBatches,
        pendingBatches: this.pendingBatches.size,
        totalVotes,
        totalConstituencies,
        avgVotesPerBatch: Math.round(avgVotesPerBatch),
        avgConstituenciesPerBatch: Math.round(avgConstituenciesPerBatch * 100) / 100,
        batchesLast24h: recentBatches24h.length,
        finalizationRate: totalBatches > 0 ? (finalizedBatches / totalBatches) * 100 : 0
      };
    } catch (error) {
      console.error('Error getting rollup statistics:', error);
      throw error;
    }
  }

  /**
   * Calculate energy usage for operations
   */
  calculateEnergyUsage(operation, processingTimeMs, gasUsed = 0) {
    // Base energy consumption factors (in Joules)
    const baseFactors = {
      submit_constituency: 0.1,
      process_batch: 0.5,
      sign_batch: 0.2,
      verify_result: 0.05
    };
    
    const baseFactor = baseFactors[operation] || 0.1;
    
    // Calculate energy based on processing time and gas usage
    const timeEnergy = (processingTimeMs / 1000) * baseFactor;
    const gasEnergy = gasUsed * 0.000001; // Convert gas to energy
    
    return timeEnergy + gasEnergy;
  }

  /**
   * Force process pending batch
   */
  async forceProcessBatch(batchId) {
    if (!this.pendingBatches.has(batchId)) {
      throw new Error('Batch not found in pending batches');
    }
    
    return await this.processBatch(batchId);
  }

  /**
   * Get pending batches info
   */
  getPendingBatchesInfo() {
    const batches = [];
    
    for (const [batchId, batch] of this.pendingBatches.entries()) {
      batches.push({
        batchId,
        status: batch.status,
        constituencyCount: batch.constituencyResults.length,
        createdAt: batch.createdAt,
        processedAt: batch.processedAt,
        error: batch.error
      });
    }
    
    return batches.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Clean up old processed batches from memory
   */
  cleanupProcessedBatches() {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [batchId, batch] of this.pendingBatches.entries()) {
      if (batch.status === 'processed' && batch.processedAt && batch.processedAt < cutoffTime) {
        this.pendingBatches.delete(batchId);
      }
    }
  }

  /**
   * Health check for rollup service
   */
  async healthCheck() {
    try {
      const pendingBatchesInfo = this.getPendingBatchesInfo();
      const recentStats = await this.getRollupStats();
      
      return {
        healthy: true,
        initialized: this.initialized,
        pendingBatches: pendingBatchesInfo.length,
        batchInterval: this.batchInterval,
        maxBatchSize: this.maxBatchSize,
        recentStats,
        lastCleanup: new Date().toISOString()
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

module.exports = RollupService;