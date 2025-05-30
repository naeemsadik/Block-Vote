const express = require('express');
const router = express.Router();
const AuditService = require('../services/auditService');
const BlockchainService = require('../services/blockchainService');
const DatabaseService = require('../services/databaseService');
const { ethers } = require('ethers');

// Initialize services
const auditService = new AuditService();
const blockchainService = new BlockchainService();
const dbService = new DatabaseService();

/**
 * @route GET /api/audit/trail
 * @desc Get audit trail with filtering and pagination
 */
router.get('/trail', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      tier,
      action,
      actor,
      startDate,
      endDate,
      transactionHash
    } = req.query;
    
    const filters = {};
    if (tier) filters.tier = tier;
    if (action) filters.action = action;
    if (actor) filters.actor = actor;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (transactionHash) filters.transactionHash = transactionHash;
    
    const auditTrail = await auditService.getAuditTrail({
      page: parseInt(page),
      limit: parseInt(limit),
      filters
    });
    
    res.json({
      success: true,
      data: {
        auditTrail: auditTrail.records,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: auditTrail.total,
          pages: Math.ceil(auditTrail.total / parseInt(limit))
        },
        filters
      }
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
 * @route POST /api/audit/record
 * @desc Create a new audit record
 */
router.post('/record', async (req, res) => {
  try {
    const {
      action,
      tier,
      actor,
      dataHash,
      transactionHash,
      blockNumber,
      metadata,
      description
    } = req.body;
    
    if (!action || !tier || !actor) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: action, tier, actor'
      });
    }
    
    const auditRecord = await auditService.createAuditRecord({
      action,
      tier,
      actor,
      dataHash: dataHash || null,
      transactionHash: transactionHash || null,
      blockNumber: blockNumber || null,
      metadata: metadata || {},
      description: description || '',
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      data: {
        auditId: auditRecord.id,
        action,
        tier,
        actor,
        created: true,
        timestamp: auditRecord.timestamp
      }
    });
  } catch (error) {
    console.error('Error creating audit record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create audit record',
      message: error.message
    });
  }
});

/**
 * @route GET /api/audit/record/:id
 * @desc Get specific audit record by ID
 */
router.get('/record/:id', async (req, res) => {
  try {
    const auditId = req.params.id;
    const auditRecord = await auditService.getAuditRecord(auditId);
    
    if (!auditRecord) {
      return res.status(404).json({
        success: false,
        error: 'Audit record not found'
      });
    }
    
    res.json({
      success: true,
      data: auditRecord
    });
  } catch (error) {
    console.error('Error fetching audit record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit record',
      message: error.message
    });
  }
});

/**
 * @route GET /api/audit/stats
 * @desc Get audit statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    const stats = await auditService.getAuditStats(period);
    
    res.json({
      success: true,
      data: {
        statistics: stats,
        period,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit statistics',
      message: error.message
    });
  }
});

/**
 * @route GET /api/audit/verify/:hash
 * @desc Verify data integrity using hash
 */
router.get('/verify/:hash', async (req, res) => {
  try {
    const dataHash = req.params.hash;
    const { data } = req.query;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Missing data parameter for verification'
      });
    }
    
    const isValid = await auditService.verifyDataIntegrity(dataHash, data);
    const auditRecords = await auditService.getRecordsByHash(dataHash);
    
    res.json({
      success: true,
      data: {
        hash: dataHash,
        isValid,
        auditRecords,
        verifiedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error verifying data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify data integrity',
      message: error.message
    });
  }
});

/**
 * @route GET /api/audit/actor/:address
 * @desc Get audit trail for specific actor
 */
router.get('/actor/:address', async (req, res) => {
  try {
    const actorAddress = req.params.address;
    const { page = 1, limit = 50, action } = req.query;
    
    const filters = { actor: actorAddress };
    if (action) filters.action = action;
    
    const actorAudit = await auditService.getAuditTrail({
      page: parseInt(page),
      limit: parseInt(limit),
      filters
    });
    
    res.json({
      success: true,
      data: {
        actor: actorAddress,
        auditTrail: actorAudit.records,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: actorAudit.total,
          pages: Math.ceil(actorAudit.total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching actor audit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch actor audit trail',
      message: error.message
    });
  }
});

/**
 * @route GET /api/audit/transaction/:hash
 * @desc Get audit records for specific transaction
 */
router.get('/transaction/:hash', async (req, res) => {
  try {
    const transactionHash = req.params.hash;
    
    const auditRecords = await auditService.getRecordsByTransaction(transactionHash);
    const blockchainData = await blockchainService.getTransactionDetails(transactionHash);
    
    res.json({
      success: true,
      data: {
        transactionHash,
        auditRecords,
        blockchainData,
        recordCount: auditRecords.length
      }
    });
  } catch (error) {
    console.error('Error fetching transaction audit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction audit records',
      message: error.message
    });
  }
});

/**
 * @route GET /api/audit/export
 * @desc Export audit trail
 */
router.get('/export', async (req, res) => {
  try {
    const {
      format = 'json',
      startDate,
      endDate,
      tier,
      action
    } = req.query;
    
    const filters = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (tier) filters.tier = tier;
    if (action) filters.action = action;
    
    const exportData = await auditService.exportAuditTrail(filters);
    
    if (format === 'csv') {
      const csvData = await auditService.convertToCSV(exportData);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit_trail.csv');
      res.send(csvData);
    } else if (format === 'pdf') {
      const pdfBuffer = await auditService.generatePDFReport(exportData);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=audit_trail.pdf');
      res.send(pdfBuffer);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=audit_trail.json');
      res.json({
        success: true,
        data: {
          auditTrail: exportData,
          filters,
          exportedAt: new Date().toISOString(),
          recordCount: exportData.length
        }
      });
    }
  } catch (error) {
    console.error('Error exporting audit trail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export audit trail',
      message: error.message
    });
  }
});

/**
 * @route POST /api/audit/integrity-check
 * @desc Perform comprehensive integrity check
 */
router.post('/integrity-check', async (req, res) => {
  try {
    const { tier, startDate, endDate } = req.body;
    
    const integrityReport = await auditService.performIntegrityCheck({
      tier,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    });
    
    res.json({
      success: true,
      data: {
        integrityReport,
        checkedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error performing integrity check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform integrity check',
      message: error.message
    });
  }
});

/**
 * @route GET /api/audit/compliance
 * @desc Get compliance report
 */
router.get('/compliance', async (req, res) => {
  try {
    const { standard = 'general', period = '30d' } = req.query;
    
    const complianceReport = await auditService.generateComplianceReport({
      standard,
      period
    });
    
    res.json({
      success: true,
      data: {
        compliance: complianceReport,
        standard,
        period,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate compliance report',
      message: error.message
    });
  }
});

/**
 * @route GET /api/audit/timeline
 * @desc Get audit timeline for visualization
 */
router.get('/timeline', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      granularity = 'hour',
      tier
    } = req.query;
    
    const timeline = await auditService.getAuditTimeline({
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate) : new Date(),
      granularity,
      tier
    });
    
    res.json({
      success: true,
      data: {
        timeline,
        granularity,
        tier: tier || 'all',
        dataPoints: timeline.length
      }
    });
  } catch (error) {
    console.error('Error fetching audit timeline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit timeline',
      message: error.message
    });
  }
});

/**
 * @route POST /api/audit/alert
 * @desc Create audit alert for suspicious activities
 */
router.post('/alert', async (req, res) => {
  try {
    const {
      type,
      severity,
      description,
      relatedRecords,
      actor,
      metadata
    } = req.body;
    
    if (!type || !severity || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, severity, description'
      });
    }
    
    const alertId = await auditService.createAlert({
      type,
      severity,
      description,
      relatedRecords: relatedRecords || [],
      actor: actor || null,
      metadata: metadata || {},
      createdAt: new Date()
    });
    
    res.json({
      success: true,
      data: {
        alertId,
        type,
        severity,
        created: true,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating audit alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create audit alert',
      message: error.message
    });
  }
});

/**
 * @route GET /api/audit/alerts
 * @desc Get audit alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      severity,
      type,
      resolved
    } = req.query;
    
    const filters = {};
    if (severity) filters.severity = severity;
    if (type) filters.type = type;
    if (resolved !== undefined) filters.resolved = resolved === 'true';
    
    const alerts = await auditService.getAlerts({
      page: parseInt(page),
      limit: parseInt(limit),
      filters
    });
    
    res.json({
      success: true,
      data: {
        alerts: alerts.records,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: alerts.total,
          pages: Math.ceil(alerts.total / parseInt(limit))
        },
        filters
      }
    });
  } catch (error) {
    console.error('Error fetching audit alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit alerts',
      message: error.message
    });
  }
});

/**
 * @route PUT /api/audit/alert/:id/resolve
 * @desc Resolve audit alert
 */
router.put('/alert/:id/resolve', async (req, res) => {
  try {
    const alertId = req.params.id;
    const { resolution, resolvedBy } = req.body;
    
    if (!resolution || !resolvedBy) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: resolution, resolvedBy'
      });
    }
    
    const resolved = await auditService.resolveAlert(alertId, {
      resolution,
      resolvedBy,
      resolvedAt: new Date()
    });
    
    res.json({
      success: true,
      data: {
        alertId,
        resolved: true,
        resolvedBy,
        resolvedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error resolving audit alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve audit alert',
      message: error.message
    });
  }
});

module.exports = router;