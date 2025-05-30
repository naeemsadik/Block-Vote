const express = require('express');
const { ethers } = require('ethers');
const router = express.Router();
const BlockchainService = require('../services/blockchainService');
const EnergyService = require('../services/energyService');
const DatabaseService = require('../services/databaseService');
const AuditService = require('../services/auditService');

// Initialize services
const blockchainService = new BlockchainService();
const energyService = new EnergyService();
const dbService = new DatabaseService();
const auditService = new AuditService();

/**
 * @route GET /api/national/contracts
 * @desc Get national contract address
 */
router.get('/contracts', async (req, res) => {
  try {
    const contracts = await blockchainService.getNationalContracts();
    res.json({
      success: true,
      data: contracts
    });
  } catch (error) {
    console.error('Error fetching national contracts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch national contracts',
      message: error.message
    });
  }
});

/**
 * @route POST /api/national/submit-division
 * @desc Submit division results to national tally
 */
router.post('/submit-division', async (req, res) => {
  try {
    const {
      divisionId,
      aggregatedRoot,
      totalVotes,
      candidateIds,
      candidateVotes,
      validatorAddress,
      signature
    } = req.body;
    
    // Validate input
    if (!divisionId || !aggregatedRoot || !totalVotes || !candidateIds || !candidateVotes || !validatorAddress) {
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
        error: 'Validator not authorized to submit division results'
      });
    }
    
    // Check if election is finalized
    const isFinalized = await blockchainService.isElectionFinalized();
    if (isFinalized) {
      return res.status(400).json({
        success: false,
        error: 'Election already finalized'
      });
    }
    
    // Record gas usage before transaction
    const gasStart = await energyService.getCurrentGasUsage();
    
    // Submit division result to national contract
    const txResult = await blockchainService.submitDivisionResult(
      divisionId,
      aggregatedRoot,
      totalVotes,
      candidateIds,
      candidateVotes,
      validatorAddress
    );
    
    // Record gas usage after transaction
    const gasEnd = await energyService.getCurrentGasUsage();
    const gasUsed = gasEnd - gasStart;
    
    // Store division result record in database
    await dbService.storeDivisionResult({
      divisionId,
      aggregatedRoot,
      totalVotes,
      candidateVotes: JSON.stringify(candidateVotes),
      transactionHash: txResult.transactionHash,
      blockNumber: txResult.blockNumber,
      gasUsed,
      submitter: validatorAddress,
      timestamp: new Date()
    });
    
    // Update energy statistics
    await energyService.recordNationalEnergy(gasUsed);
    
    // Create audit record
    await auditService.createAuditRecord({
      action: 'DIVISION_RESULT_SUBMITTED',
      divisionId,
      dataHash: aggregatedRoot,
      actor: validatorAddress,
      transactionHash: txResult.transactionHash
    });
    
    res.json({
      success: true,
      data: {
        divisionId,
        transactionHash: txResult.transactionHash,
        blockNumber: txResult.blockNumber,
        gasUsed,
        timestamp: txResult.timestamp
      }
    });
  } catch (error) {
    console.error('Error submitting division result:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit division result',
      message: error.message
    });
  }
});

/**
 * @route GET /api/national/results
 * @desc Get national election results
 */
router.get('/results', async (req, res) => {
  try {
    const results = await blockchainService.getNationalResults();
    const candidates = await blockchainService.getAllCandidateResults();
    const energyStats = await energyService.getNationalEnergyStats();
    
    res.json({
      success: true,
      data: {
        nationalResults: results,
        candidates,
        energyStatistics: energyStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching national results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch national results',
      message: error.message
    });
  }
});

/**
 * @route GET /api/national/candidates
 * @desc Get all national candidates with results
 */
router.get('/candidates', async (req, res) => {
  try {
    const candidates = await blockchainService.getAllCandidateResults();
    
    res.json({
      success: true,
      data: {
        candidates,
        count: candidates.length
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
 * @route GET /api/national/candidate/:id
 * @desc Get specific candidate results
 */
router.get('/candidate/:id', async (req, res) => {
  try {
    const candidateId = req.params.id;
    const candidate = await blockchainService.getCandidateResults(candidateId);
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }
    
    res.json({
      success: true,
      data: candidate
    });
  } catch (error) {
    console.error('Error fetching candidate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch candidate',
      message: error.message
    });
  }
});

/**
 * @route POST /api/national/finalize
 * @desc Finalize national election results
 */
router.post('/finalize', async (req, res) => {
  try {
    const { validatorAddress, signature } = req.body;
    
    if (!validatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing validator address'
      });
    }
    
    // Verify validator authorization
    const isAuthorized = await blockchainService.isNationalValidator(validatorAddress);
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Validator not authorized for national operations'
      });
    }
    
    // Check if already finalized
    const isFinalized = await blockchainService.isElectionFinalized();
    if (isFinalized) {
      return res.status(400).json({
        success: false,
        error: 'Election already finalized'
      });
    }
    
    // Check if all divisions have submitted results
    const allDivisionsSubmitted = await blockchainService.areAllDivisionsSubmitted();
    if (!allDivisionsSubmitted) {
      return res.status(400).json({
        success: false,
        error: 'Not all divisions have submitted results'
      });
    }
    
    // Record gas usage before transaction
    const gasStart = await energyService.getCurrentGasUsage();
    
    // Finalize national results
    const txResult = await blockchainService.finalizeNationalResult(validatorAddress);
    
    // Record gas usage after transaction
    const gasEnd = await energyService.getCurrentGasUsage();
    const gasUsed = gasEnd - gasStart;
    
    // Store finalization record
    await dbService.storeFinalizationRecord({
      finalizer: validatorAddress,
      transactionHash: txResult.transactionHash,
      blockNumber: txResult.blockNumber,
      gasUsed,
      timestamp: new Date()
    });
    
    // Update energy statistics
    await energyService.recordFinalizationEnergy(gasUsed);
    
    // Create audit record
    await auditService.createAuditRecord({
      action: 'NATIONAL_RESULT_FINALIZED',
      dataHash: txResult.finalResultHash,
      actor: validatorAddress,
      transactionHash: txResult.transactionHash
    });
    
    res.json({
      success: true,
      data: {
        finalized: true,
        finalizer: validatorAddress,
        transactionHash: txResult.transactionHash,
        blockNumber: txResult.blockNumber,
        gasUsed,
        timestamp: txResult.timestamp
      }
    });
  } catch (error) {
    console.error('Error finalizing results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to finalize results',
      message: error.message
    });
  }
});

/**
 * @route GET /api/national/audit-trail
 * @desc Get complete audit trail
 */
router.get('/audit-trail', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    const auditTrail = await blockchainService.getAuditTrail({
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      data: auditTrail
    });
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit trail',
      message: error.message
    });
  }
});

/**
 * @route GET /api/national/divisions
 * @desc Get all division results
 */
router.get('/divisions', async (req, res) => {
  try {
    const divisions = await blockchainService.getAllDivisionResults();
    
    res.json({
      success: true,
      data: {
        divisions,
        count: divisions.length
      }
    });
  } catch (error) {
    console.error('Error fetching divisions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch division results',
      message: error.message
    });
  }
});

/**
 * @route GET /api/national/division/:id
 * @desc Get specific division result
 */
router.get('/division/:id', async (req, res) => {
  try {
    const divisionId = req.params.id;
    const division = await blockchainService.getDivisionResult(divisionId);
    
    if (!division) {
      return res.status(404).json({
        success: false,
        error: 'Division result not found'
      });
    }
    
    res.json({
      success: true,
      data: division
    });
  } catch (error) {
    console.error('Error fetching division:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch division result',
      message: error.message
    });
  }
});

/**
 * @route GET /api/national/stats
 * @desc Get national tier statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const nationalStats = await blockchainService.getNationalStats();
    const energyStats = await energyService.getNationalEnergyStats();
    const auditStats = await auditService.getAuditStats();
    
    res.json({
      success: true,
      data: {
        national: nationalStats,
        energy: energyStats,
        audit: auditStats,
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
 * @route POST /api/national/verify-division
 * @desc Verify division result using Merkle proof
 */
router.post('/verify-division', async (req, res) => {
  try {
    const { divisionId, proof, leaf, validatorAddress } = req.body;
    
    if (!divisionId || !proof || !leaf || !validatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Verify validator authorization
    const isAuthorized = await blockchainService.isNationalValidator(validatorAddress);
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Validator not authorized for national operations'
      });
    }
    
    const isValid = await blockchainService.verifyDivisionResult(divisionId, proof, leaf, validatorAddress);
    
    // Create audit record
    await auditService.createAuditRecord({
      action: 'DIVISION_RESULT_VERIFIED',
      divisionId,
      dataHash: leaf,
      actor: validatorAddress,
      verified: isValid
    });
    
    res.json({
      success: true,
      data: {
        divisionId,
        isValid,
        verifiedBy: validatorAddress,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error verifying division result:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify division result',
      message: error.message
    });
  }
});

/**
 * @route GET /api/national/export
 * @desc Export complete election data
 */
router.get('/export', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    
    const exportData = await blockchainService.exportElectionData();
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=election_results.csv');
      res.send(await auditService.convertToCSV(exportData));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=election_results.json');
      res.json({
        success: true,
        data: exportData,
        exportedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export election data',
      message: error.message
    });
  }
});

module.exports = router;