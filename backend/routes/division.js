const express = require('express');
const { ethers } = require('ethers');
const router = express.Router();
const BlockchainService = require('../services/blockchainService');
const RollupService = require('../services/rollupService');
const EnergyService = require('../services/energyService');
const DatabaseService = require('../services/databaseService');

// Initialize services
const blockchainService = new BlockchainService();
const rollupService = new RollupService();
const energyService = new EnergyService();
const dbService = new DatabaseService();

/**
 * @route GET /api/division/contracts
 * @desc Get division contract addresses
 */
router.get('/contracts', async (req, res) => {
  try {
    const contracts = await blockchainService.getDivisionContracts();
    res.json({
      success: true,
      data: contracts
    });
  } catch (error) {
    console.error('Error fetching division contracts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch division contracts',
      message: error.message
    });
  }
});

/**
 * @route POST /api/division/submit-rollup
 * @desc Submit constituency rollup to division tier
 */
router.post('/submit-rollup', async (req, res) => {
  try {
    const {
      constituencyId,
      merkleRoot,
      totalVotes,
      candidateIds,
      candidateVotes,
      validatorAddress,
      signature
    } = req.body;
    
    // Validate input
    if (!constituencyId || !merkleRoot || !totalVotes || !candidateIds || !candidateVotes || !validatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    if (candidateIds.length !== candidateVotes.length) {
      return res.status(400).json({
        success: false,
        error: 'Candidate IDs and votes arrays must have same length'
      });
    }
    
    // Verify validator authorization
    const isAuthorized = await blockchainService.isDivisionValidator(validatorAddress);
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Validator not authorized for division tier'
      });
    }
    
    // Record gas usage before transaction
    const gasStart = await energyService.getCurrentGasUsage();
    
    // Submit rollup to division contract
    const txResult = await blockchainService.submitConstituencyResult(
      constituencyId,
      merkleRoot,
      totalVotes,
      candidateIds,
      candidateVotes,
      validatorAddress
    );
    
    // Record gas usage after transaction
    const gasEnd = await energyService.getCurrentGasUsage();
    const gasUsed = gasEnd - gasStart;
    
    // Store rollup record in database
    await dbService.storeRollupRecord({
      constituencyId,
      merkleRoot,
      totalVotes,
      candidateVotes: JSON.stringify(candidateVotes),
      transactionHash: txResult.transactionHash,
      blockNumber: txResult.blockNumber,
      gasUsed,
      submitter: validatorAddress,
      timestamp: new Date()
    });
    
    // Update energy statistics
    await energyService.recordRollupEnergy(gasUsed);
    
    res.json({
      success: true,
      data: {
        constituencyId,
        transactionHash: txResult.transactionHash,
        blockNumber: txResult.blockNumber,
        gasUsed,
        timestamp: txResult.timestamp
      }
    });
  } catch (error) {
    console.error('Error submitting rollup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit rollup',
      message: error.message
    });
  }
});

/**
 * @route GET /api/division/rollups
 * @desc Get all rollup batches
 */
router.get('/rollups', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const rollups = await blockchainService.getRollupBatches({
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });
    
    res.json({
      success: true,
      data: rollups
    });
  } catch (error) {
    console.error('Error fetching rollups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rollups',
      message: error.message
    });
  }
});

/**
 * @route GET /api/division/rollup/:id
 * @desc Get specific rollup batch details
 */
router.get('/rollup/:id', async (req, res) => {
  try {
    const batchId = req.params.id;
    const rollup = await blockchainService.getRollupBatch(batchId);
    
    if (!rollup) {
      return res.status(404).json({
        success: false,
        error: 'Rollup batch not found'
      });
    }
    
    res.json({
      success: true,
      data: rollup
    });
  } catch (error) {
    console.error('Error fetching rollup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rollup',
      message: error.message
    });
  }
});

/**
 * @route POST /api/division/create-batch
 * @desc Create a new rollup batch from constituency results
 */
router.post('/create-batch', async (req, res) => {
  try {
    const { constituencyIds, validatorAddress, signature } = req.body;
    
    if (!constituencyIds || !Array.isArray(constituencyIds) || constituencyIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid constituency IDs array'
      });
    }
    
    // Verify validator authorization
    const isAuthorized = await blockchainService.isDivisionValidator(validatorAddress);
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Validator not authorized for division tier'
      });
    }
    
    // Check if rollup window is open
    const canCreateRollup = await blockchainService.canCreateRollup();
    if (!canCreateRollup) {
      return res.status(400).json({
        success: false,
        error: 'Rollup window not open yet'
      });
    }
    
    // Record gas usage before transaction
    const gasStart = await energyService.getCurrentGasUsage();
    
    // Create rollup batch
    const txResult = await blockchainService.createRollupBatch(constituencyIds, validatorAddress);
    
    // Record gas usage after transaction
    const gasEnd = await energyService.getCurrentGasUsage();
    const gasUsed = gasEnd - gasStart;
    
    // Store batch record in database
    await dbService.storeBatchRecord({
      batchId: txResult.batchId,
      constituencyIds: JSON.stringify(constituencyIds),
      aggregatedRoot: txResult.aggregatedRoot,
      totalVotes: txResult.totalVotes,
      transactionHash: txResult.transactionHash,
      blockNumber: txResult.blockNumber,
      gasUsed,
      creator: validatorAddress,
      timestamp: new Date()
    });
    
    // Update energy statistics
    await energyService.recordBatchEnergy(gasUsed);
    
    res.json({
      success: true,
      data: {
        batchId: txResult.batchId,
        aggregatedRoot: txResult.aggregatedRoot,
        constituencyIds,
        totalVotes: txResult.totalVotes,
        transactionHash: txResult.transactionHash,
        gasUsed
      }
    });
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create rollup batch',
      message: error.message
    });
  }
});

/**
 * @route POST /api/division/sign-rollup
 * @desc Sign a rollup batch for multi-sig approval
 */
router.post('/sign-rollup', async (req, res) => {
  try {
    const { batchId, validatorAddress, signature } = req.body;
    
    if (!batchId || !validatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: batchId, validatorAddress'
      });
    }
    
    // Verify validator authorization
    const isAuthorized = await blockchainService.isDivisionValidator(validatorAddress);
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Validator not authorized for division tier'
      });
    }
    
    // Check if batch exists and is not finalized
    const batch = await blockchainService.getRollupBatch(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        error: 'Rollup batch not found'
      });
    }
    
    if (batch.finalized) {
      return res.status(400).json({
        success: false,
        error: 'Rollup batch already finalized'
      });
    }
    
    // Sign the rollup batch
    const txResult = await blockchainService.signRollupBatch(batchId, validatorAddress);
    
    // Store signature record
    await dbService.storeSignatureRecord({
      batchId,
      validator: validatorAddress,
      transactionHash: txResult.transactionHash,
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      data: {
        batchId,
        validator: validatorAddress,
        transactionHash: txResult.transactionHash,
        signatureCount: txResult.signatureCount,
        finalized: txResult.finalized
      }
    });
  } catch (error) {
    console.error('Error signing rollup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sign rollup',
      message: error.message
    });
  }
});

/**
 * @route GET /api/division/validators
 * @desc Get division tier validators
 */
router.get('/validators', async (req, res) => {
  try {
    const validators = await blockchainService.getDivisionValidators();
    
    res.json({
      success: true,
      data: {
        validators,
        count: validators.length
      }
    });
  } catch (error) {
    console.error('Error fetching validators:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch validators',
      message: error.message
    });
  }
});

/**
 * @route GET /api/division/stats
 * @desc Get division tier statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await blockchainService.getDivisionStats();
    const energyStats = await energyService.getDivisionEnergyStats();
    
    res.json({
      success: true,
      data: {
        rollup: stats,
        energy: energyStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

/**
 * @route POST /api/division/verify-result
 * @desc Verify constituency result using Merkle proof
 */
router.post('/verify-result', async (req, res) => {
  try {
    const { constituencyId, proof, leaf, validatorAddress } = req.body;
    
    if (!constituencyId || !proof || !leaf || !validatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Verify validator authorization
    const isAuthorized = await blockchainService.isDivisionValidator(validatorAddress);
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Validator not authorized for division tier'
      });
    }
    
    const isValid = await blockchainService.verifyConstituencyResult(constituencyId, proof, leaf, validatorAddress);
    
    res.json({
      success: true,
      data: {
        constituencyId,
        isValid,
        verifiedBy: validatorAddress,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error verifying result:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify result',
      message: error.message
    });
  }
});

module.exports = router;