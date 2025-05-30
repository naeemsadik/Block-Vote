const express = require('express');
const { ethers } = require('ethers');
const router = express.Router();
const BlockchainService = require('../services/blockchainService');
const EnergyService = require('../services/energyService');
const DatabaseService = require('../services/databaseService');

// Initialize services
const blockchainService = new BlockchainService();
const energyService = new EnergyService();
const dbService = new DatabaseService();

/**
 * @route GET /api/constituency/contracts
 * @desc Get constituency contract addresses
 */
router.get('/contracts', async (req, res) => {
  try {
    const contracts = await blockchainService.getConstituencyContracts();
    res.json({
      success: true,
      data: contracts
    });
  } catch (error) {
    console.error('Error fetching constituency contracts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch constituency contracts',
      message: error.message
    });
  }
});

/**
 * @route GET /api/constituency/:id/candidates
 * @desc Get candidates for a specific constituency
 */
router.get('/:id/candidates', async (req, res) => {
  try {
    const constituencyId = req.params.id;
    const candidates = await blockchainService.getConstituencyCandidates(constituencyId);
    
    res.json({
      success: true,
      data: {
        constituencyId,
        candidates
      }
    });
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch candidates',
      message: error.message
    });
  }
});

/**
 * @route GET /api/constituency/:id/results
 * @desc Get voting results for a specific constituency
 */
router.get('/:id/results', async (req, res) => {
  try {
    const constituencyId = req.params.id;
    const results = await blockchainService.getConstituencyResults(constituencyId);
    const stats = await blockchainService.getConstituencyStats(constituencyId);
    
    res.json({
      success: true,
      data: {
        constituencyId,
        results,
        statistics: stats
      }
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch results',
      message: error.message
    });
  }
});

/**
 * @route POST /api/constituency/:id/vote
 * @desc Cast a vote in a specific constituency
 */
router.post('/:id/vote', async (req, res) => {
  try {
    const constituencyId = req.params.id;
    const { voterAddress, candidateId, signature } = req.body;
    
    // Validate input
    if (!voterAddress || !candidateId || !signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: voterAddress, candidateId, signature'
      });
    }
    
    // Verify voter eligibility
    const isEligible = await blockchainService.checkVoterEligibility(constituencyId, voterAddress);
    if (!isEligible) {
      return res.status(403).json({
        success: false,
        error: 'Voter not eligible or has already voted'
      });
    }
    
    // Record gas usage before transaction
    const gasStart = await energyService.getCurrentGasUsage();
    
    // Cast vote
    const txResult = await blockchainService.castVote(constituencyId, voterAddress, candidateId, signature);
    
    // Record gas usage after transaction
    const gasEnd = await energyService.getCurrentGasUsage();
    const gasUsed = gasEnd - gasStart;
    
    // Store vote record in database
    await dbService.storeVoteRecord({
      constituencyId,
      voterAddress,
      candidateId,
      transactionHash: txResult.transactionHash,
      blockNumber: txResult.blockNumber,
      gasUsed,
      timestamp: new Date()
    });
    
    // Update energy statistics
    await energyService.recordVoteEnergy(gasUsed);
    
    res.json({
      success: true,
      data: {
        transactionHash: txResult.transactionHash,
        blockNumber: txResult.blockNumber,
        gasUsed,
        timestamp: txResult.timestamp
      }
    });
  } catch (error) {
    console.error('Error casting vote:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cast vote',
      message: error.message
    });
  }
});

/**
 * @route GET /api/constituency/:id/voter/:address
 * @desc Get voter information and voting status
 */
router.get('/:id/voter/:address', async (req, res) => {
  try {
    const constituencyId = req.params.id;
    const voterAddress = req.params.address;
    
    // Validate address format
    if (!ethers.isAddress(voterAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid voter address format'
      });
    }
    
    const voterInfo = await blockchainService.getVoterInfo(constituencyId, voterAddress);
    
    res.json({
      success: true,
      data: {
        constituencyId,
        voterAddress,
        ...voterInfo
      }
    });
  } catch (error) {
    console.error('Error fetching voter info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch voter information',
      message: error.message
    });
  }
});

/**
 * @route POST /api/constituency/:id/verify
 * @desc Verify a vote using Merkle proof
 */
router.post('/:id/verify', async (req, res) => {
  try {
    const constituencyId = req.params.id;
    const { voterAddress, proof, leaf } = req.body;
    
    if (!voterAddress || !proof || !leaf) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: voterAddress, proof, leaf'
      });
    }
    
    const isValid = await blockchainService.verifyVoteProof(constituencyId, proof, leaf);
    
    res.json({
      success: true,
      data: {
        constituencyId,
        voterAddress,
        isValid,
        verifiedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error verifying vote:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify vote',
      message: error.message
    });
  }
});

/**
 * @route GET /api/constituency/:id/merkle-root
 * @desc Get current Merkle root for constituency
 */
router.get('/:id/merkle-root', async (req, res) => {
  try {
    const constituencyId = req.params.id;
    const merkleRoot = await blockchainService.getConstituencyMerkleRoot(constituencyId);
    
    res.json({
      success: true,
      data: {
        constituencyId,
        merkleRoot,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching Merkle root:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Merkle root',
      message: error.message
    });
  }
});

/**
 * @route GET /api/constituency/:id/validators
 * @desc Get active validators for constituency
 */
router.get('/:id/validators', async (req, res) => {
  try {
    const constituencyId = req.params.id;
    const validators = await blockchainService.getConstituencyValidators(constituencyId);
    
    res.json({
      success: true,
      data: {
        constituencyId,
        validators
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
 * @route GET /api/constituency/:id/stats
 * @desc Get constituency statistics
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const constituencyId = req.params.id;
    const stats = await blockchainService.getConstituencyStats(constituencyId);
    const energyStats = await energyService.getConstituencyEnergyStats(constituencyId);
    
    res.json({
      success: true,
      data: {
        constituencyId,
        voting: stats,
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
 * @route POST /api/constituency/:id/generate-proof
 * @desc Generate Merkle proof for a vote
 */
router.post('/:id/generate-proof', async (req, res) => {
  try {
    const constituencyId = req.params.id;
    const { voterAddress, candidateId, timestamp } = req.body;
    
    if (!voterAddress || !candidateId || !timestamp) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: voterAddress, candidateId, timestamp'
      });
    }
    
    const proof = await blockchainService.generateVoteProof(constituencyId, voterAddress, candidateId, timestamp);
    
    res.json({
      success: true,
      data: {
        constituencyId,
        voterAddress,
        proof
      }
    });
  } catch (error) {
    console.error('Error generating proof:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate proof',
      message: error.message
    });
  }
});

module.exports = router;