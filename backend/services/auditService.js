const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class AuditService {
  constructor(databaseService, energyService) {
    this.databaseService = databaseService;
    this.energyService = energyService;
    this.auditQueue = [];
    this.processingQueue = false;
    this.alertThresholds = {
      suspiciousVotingPattern: 10, // votes from same IP in short time
      highEnergyConsumption: 1000, // Joules
      failedTransactions: 5, // failed transactions in 10 minutes
      unauthorizedAccess: 3 // unauthorized attempts
    };
    this.activeAlerts = new Map();
    this.initialized = false;
  }

  /**
   * Initialize audit service
   */
  async initialize() {
    try {
      if (!this.databaseService.initialized) {
        await this.databaseService.initialize();
      }
      
      this.initialized = true;
      console.log('AuditService initialized successfully');
      
      // Start queue processor
      this.startQueueProcessor();
      
      // Start alert monitoring
      this.startAlertMonitoring();
    } catch (error) {
      console.error('Failed to initialize AuditService:', error);
      throw error;
    }
  }

  /**
   * Start audit queue processor
   */
  startQueueProcessor() {
    setInterval(async () => {
      if (!this.processingQueue && this.auditQueue.length > 0) {
        await this.processAuditQueue();
      }
    }, 1000); // Process every second
  }

  /**
   * Start alert monitoring
   */
  startAlertMonitoring() {
    setInterval(async () => {
      try {
        await this.checkForSuspiciousActivity();
      } catch (error) {
        console.error('Error in alert monitoring:', error);
      }
    }, 60000); // Check every minute
  }

  /**
   * Log audit record
   */
  async logAuditRecord(auditData) {
    try {
      const startTime = Date.now();
      
      // Create audit record
      const auditRecord = {
        action: auditData.action,
        tier: auditData.tier || 'unknown',
        actor: auditData.actor,
        dataHash: auditData.dataHash || this.generateDataHash(auditData),
        transactionHash: auditData.transactionHash || null,
        blockNumber: auditData.blockNumber || null,
        metadata: {
          ...auditData.metadata,
          userAgent: auditData.userAgent || null,
          ipAddress: auditData.ipAddress || null,
          sessionId: auditData.sessionId || null
        },
        description: auditData.description || '',
        severity: auditData.severity || 'info', // info, warning, error, critical
        timestamp: auditData.timestamp || new Date()
      };
      
      // Add to queue for async processing
      this.auditQueue.push(auditRecord);
      
      // For critical actions, process immediately
      if (auditRecord.severity === 'critical') {
        await this.processAuditRecord(auditRecord);
      }
      
      // Track energy consumption
      const energyUsed = this.calculateEnergyUsage('log_audit', Date.now() - startTime);
      await this.energyService.recordEnergyConsumption({
        tier: 'audit',
        operation: 'log_audit_record',
        energyConsumed: energyUsed,
        metadata: {
          action: auditRecord.action,
          tier: auditRecord.tier,
          severity: auditRecord.severity
        }
      });
      
      return auditRecord;
    } catch (error) {
      console.error('Error logging audit record:', error);
      throw error;
    }
  }

  /**
   * Process audit queue
   */
  async processAuditQueue() {
    if (this.processingQueue || this.auditQueue.length === 0) {
      return;
    }
    
    this.processingQueue = true;
    
    try {
      const batchSize = Math.min(10, this.auditQueue.length);
      const batch = this.auditQueue.splice(0, batchSize);
      
      for (const auditRecord of batch) {
        await this.processAuditRecord(auditRecord);
      }
      
      console.log(`Processed ${batch.length} audit records`);
    } catch (error) {
      console.error('Error processing audit queue:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Process individual audit record
   */
  async processAuditRecord(auditRecord) {
    try {
      // Store in database
      const recordId = await this.databaseService.storeAuditRecord(auditRecord);
      
      // Check for suspicious patterns
      await this.analyzeForSuspiciousActivity(auditRecord);
      
      // Generate alerts if needed
      await this.checkAlertConditions(auditRecord);
      
      return recordId;
    } catch (error) {
      console.error('Error processing audit record:', error);
      throw error;
    }
  }

  /**
   * Generate data hash for audit record
   */
  generateDataHash(data) {
    const hashData = {
      action: data.action,
      actor: data.actor,
      timestamp: data.timestamp || new Date(),
      metadata: data.metadata || {}
    };
    
    return crypto.createHash('sha256')
      .update(JSON.stringify(hashData))
      .digest('hex');
  }

  /**
   * Get audit records with filtering
   */
  async getAuditRecords(filters = {}, pagination = {}) {
    try {
      const startTime = Date.now();
      
      const result = await this.databaseService.getAuditRecords(filters, pagination);
      
      // Track energy consumption
      const energyUsed = this.calculateEnergyUsage('get_audit_records', Date.now() - startTime);
      await this.energyService.recordEnergyConsumption({
        tier: 'audit',
        operation: 'get_audit_records',
        energyConsumed: energyUsed,
        metadata: {
          recordCount: result.records.length,
          filters: Object.keys(filters)
        }
      });
      
      return result;
    } catch (error) {
      console.error('Error getting audit records:', error);
      throw error;
    }
  }

  /**
   * Get audit record by ID
   */
  async getAuditRecord(recordId) {
    try {
      return await this.databaseService.getAuditRecord(recordId);
    } catch (error) {
      console.error('Error getting audit record:', error);
      throw error;
    }
  }

  /**
   * Verify audit trail integrity
   */
  async verifyAuditIntegrity(filters = {}) {
    try {
      const startTime = Date.now();
      
      const { records } = await this.databaseService.getAuditRecords(filters, { limit: 1000 });
      
      const verificationResults = {
        totalRecords: records.length,
        validRecords: 0,
        invalidRecords: 0,
        missingHashes: 0,
        duplicateHashes: new Set(),
        suspiciousRecords: []
      };
      
      const seenHashes = new Set();
      
      for (const record of records) {
        // Check if hash exists
        if (!record.dataHash) {
          verificationResults.missingHashes++;
          continue;
        }
        
        // Check for duplicate hashes
        if (seenHashes.has(record.dataHash)) {
          verificationResults.duplicateHashes.add(record.dataHash);
          verificationResults.suspiciousRecords.push({
            id: record.id,
            reason: 'Duplicate hash',
            hash: record.dataHash
          });
          continue;
        }
        
        seenHashes.add(record.dataHash);
        
        // Verify hash integrity
        const expectedHash = this.generateDataHash(record);
        if (record.dataHash === expectedHash) {
          verificationResults.validRecords++;
        } else {
          verificationResults.invalidRecords++;
          verificationResults.suspiciousRecords.push({
            id: record.id,
            reason: 'Hash mismatch',
            expected: expectedHash,
            actual: record.dataHash
          });
        }
      }
      
      verificationResults.integrityScore = verificationResults.totalRecords > 0 
        ? (verificationResults.validRecords / verificationResults.totalRecords) * 100 
        : 100;
      
      verificationResults.duplicateHashes = Array.from(verificationResults.duplicateHashes);
      
      // Track energy consumption
      const energyUsed = this.calculateEnergyUsage('verify_integrity', Date.now() - startTime);
      await this.energyService.recordEnergyConsumption({
        tier: 'audit',
        operation: 'verify_audit_integrity',
        energyConsumed: energyUsed,
        metadata: {
          recordsVerified: records.length,
          integrityScore: verificationResults.integrityScore
        }
      });
      
      return verificationResults;
    } catch (error) {
      console.error('Error verifying audit integrity:', error);
      throw error;
    }
  }

  /**
   * Generate audit report
   */
  async generateAuditReport(filters = {}, format = 'json') {
    try {
      const startTime = Date.now();
      
      const { records } = await this.databaseService.getAuditRecords(filters, { limit: 10000 });
      
      // Generate statistics
      const stats = this.generateAuditStatistics(records);
      
      // Create report data
      const reportData = {
        generatedAt: new Date().toISOString(),
        filters,
        statistics: stats,
        records: records.map(record => ({
          id: record.id,
          action: record.action,
          tier: record.tier,
          actor: record.actor,
          timestamp: record.timestamp,
          severity: record.severity,
          description: record.description
        }))
      };
      
      let report;
      
      switch (format.toLowerCase()) {
        case 'csv':
          report = this.generateCSVReport(reportData);
          break;
        case 'pdf':
          report = await this.generatePDFReport(reportData);
          break;
        default:
          report = JSON.stringify(reportData, null, 2);
      }
      
      // Track energy consumption
      const energyUsed = this.calculateEnergyUsage('generate_report', Date.now() - startTime);
      await this.energyService.recordEnergyConsumption({
        tier: 'audit',
        operation: 'generate_audit_report',
        energyConsumed: energyUsed,
        metadata: {
          format,
          recordCount: records.length,
          reportSize: report.length
        }
      });
      
      return {
        format,
        data: report,
        statistics: stats,
        generatedAt: reportData.generatedAt
      };
    } catch (error) {
      console.error('Error generating audit report:', error);
      throw error;
    }
  }

  /**
   * Generate audit statistics
   */
  generateAuditStatistics(records) {
    const stats = {
      totalRecords: records.length,
      recordsByTier: {},
      recordsByAction: {},
      recordsBySeverity: {},
      recordsByTimeframe: {},
      topActors: {},
      recentActivity: []
    };
    
    // Group by tier
    records.forEach(record => {
      stats.recordsByTier[record.tier] = (stats.recordsByTier[record.tier] || 0) + 1;
      stats.recordsByAction[record.action] = (stats.recordsByAction[record.action] || 0) + 1;
      stats.recordsBySeverity[record.severity] = (stats.recordsBySeverity[record.severity] || 0) + 1;
      stats.topActors[record.actor] = (stats.topActors[record.actor] || 0) + 1;
    });
    
    // Group by timeframe (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentRecords = records.filter(record => new Date(record.timestamp) >= last24Hours);
    
    stats.recordsByTimeframe.last24Hours = recentRecords.length;
    stats.recentActivity = recentRecords.slice(0, 10).map(record => ({
      action: record.action,
      actor: record.actor,
      timestamp: record.timestamp,
      severity: record.severity
    }));
    
    // Convert top actors to sorted array
    stats.topActors = Object.entries(stats.topActors)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([actor, count]) => ({ actor, count }));
    
    return stats;
  }

  /**
   * Generate CSV report
   */
  generateCSVReport(reportData) {
    const headers = ['ID', 'Action', 'Tier', 'Actor', 'Timestamp', 'Severity', 'Description'];
    const csvRows = [headers.join(',')];
    
    reportData.records.forEach(record => {
      const row = [
        record.id,
        record.action,
        record.tier,
        record.actor,
        record.timestamp,
        record.severity,
        `"${record.description.replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }

  /**
   * Generate PDF report (simplified)
   */
  async generatePDFReport(reportData) {
    // For a real implementation, you would use a PDF library like PDFKit
    // This is a simplified text-based version
    const lines = [
      'AUDIT REPORT',
      '=============',
      '',
      `Generated: ${reportData.generatedAt}`,
      `Total Records: ${reportData.statistics.totalRecords}`,
      '',
      'STATISTICS:',
      '------------',
      'Records by Tier:',
      ...Object.entries(reportData.statistics.recordsByTier).map(([tier, count]) => `  ${tier}: ${count}`),
      '',
      'Records by Severity:',
      ...Object.entries(reportData.statistics.recordsBySeverity).map(([severity, count]) => `  ${severity}: ${count}`),
      '',
      'RECENT ACTIVITY:',
      '----------------',
      ...reportData.statistics.recentActivity.map(activity => 
        `${activity.timestamp} - ${activity.action} by ${activity.actor} [${activity.severity}]`
      )
    ];
    
    return lines.join('\n');
  }

  /**
   * Check for suspicious activity
   */
  async checkForSuspiciousActivity() {
    try {
      const last10Minutes = new Date(Date.now() - 10 * 60 * 1000);
      
      const { records } = await this.databaseService.getAuditRecords({
        startDate: last10Minutes
      }, { limit: 1000 });
      
      // Check for suspicious voting patterns
      await this.checkSuspiciousVotingPatterns(records);
      
      // Check for failed transactions
      await this.checkFailedTransactions(records);
      
      // Check for unauthorized access attempts
      await this.checkUnauthorizedAccess(records);
      
    } catch (error) {
      console.error('Error checking for suspicious activity:', error);
    }
  }

  /**
   * Analyze record for suspicious activity
   */
  async analyzeForSuspiciousActivity(auditRecord) {
    // Check for rapid successive actions from same actor
    if (auditRecord.action === 'cast_vote') {
      const recentVotes = await this.getRecentActionsByActor(
        auditRecord.actor, 
        'cast_vote', 
        5 * 60 * 1000 // 5 minutes
      );
      
      if (recentVotes.length > this.alertThresholds.suspiciousVotingPattern) {
        await this.createAlert({
          type: 'suspicious_voting_pattern',
          severity: 'warning',
          actor: auditRecord.actor,
          description: `Suspicious voting pattern detected: ${recentVotes.length} votes in 5 minutes`,
          metadata: { voteCount: recentVotes.length }
        });
      }
    }
  }

  /**
   * Get recent actions by actor
   */
  async getRecentActionsByActor(actor, action, timeWindowMs) {
    const startTime = new Date(Date.now() - timeWindowMs);
    
    const { records } = await this.databaseService.getAuditRecords({
      actor,
      action,
      startDate: startTime
    });
    
    return records;
  }

  /**
   * Check suspicious voting patterns
   */
  async checkSuspiciousVotingPatterns(records) {
    const votingRecords = records.filter(record => record.action === 'cast_vote');
    const actorVoteCounts = {};
    
    votingRecords.forEach(record => {
      actorVoteCounts[record.actor] = (actorVoteCounts[record.actor] || 0) + 1;
    });
    
    for (const [actor, count] of Object.entries(actorVoteCounts)) {
      if (count > this.alertThresholds.suspiciousVotingPattern) {
        await this.createAlert({
          type: 'suspicious_voting_pattern',
          severity: 'warning',
          actor,
          description: `Suspicious voting pattern: ${count} votes in 10 minutes`,
          metadata: { voteCount: count }
        });
      }
    }
  }

  /**
   * Check failed transactions
   */
  async checkFailedTransactions(records) {
    const failedRecords = records.filter(record => 
      record.severity === 'error' && record.action.includes('transaction')
    );
    
    if (failedRecords.length > this.alertThresholds.failedTransactions) {
      await this.createAlert({
        type: 'high_failure_rate',
        severity: 'error',
        description: `High transaction failure rate: ${failedRecords.length} failures in 10 minutes`,
        metadata: { failureCount: failedRecords.length }
      });
    }
  }

  /**
   * Check unauthorized access attempts
   */
  async checkUnauthorizedAccess(records) {
    const unauthorizedRecords = records.filter(record => 
      record.action.includes('unauthorized') || record.severity === 'critical'
    );
    
    if (unauthorizedRecords.length > this.alertThresholds.unauthorizedAccess) {
      await this.createAlert({
        type: 'unauthorized_access',
        severity: 'critical',
        description: `Multiple unauthorized access attempts: ${unauthorizedRecords.length} attempts in 10 minutes`,
        metadata: { attemptCount: unauthorizedRecords.length }
      });
    }
  }

  /**
   * Check alert conditions
   */
  async checkAlertConditions(auditRecord) {
    // Check for critical severity
    if (auditRecord.severity === 'critical') {
      await this.createAlert({
        type: 'critical_action',
        severity: 'critical',
        actor: auditRecord.actor,
        description: `Critical action detected: ${auditRecord.action}`,
        relatedRecordId: auditRecord.id
      });
    }
    
    // Check for high energy consumption
    if (auditRecord.metadata && auditRecord.metadata.energyConsumed > this.alertThresholds.highEnergyConsumption) {
      await this.createAlert({
        type: 'high_energy_consumption',
        severity: 'warning',
        actor: auditRecord.actor,
        description: `High energy consumption detected: ${auditRecord.metadata.energyConsumed} Joules`,
        metadata: { energyConsumed: auditRecord.metadata.energyConsumed }
      });
    }
  }

  /**
   * Create alert
   */
  async createAlert(alertData) {
    try {
      const alert = {
        id: this.generateAlertId(),
        type: alertData.type,
        severity: alertData.severity,
        actor: alertData.actor || 'system',
        description: alertData.description,
        metadata: alertData.metadata || {},
        relatedRecordId: alertData.relatedRecordId || null,
        status: 'active',
        createdAt: new Date(),
        resolvedAt: null,
        resolvedBy: null
      };
      
      this.activeAlerts.set(alert.id, alert);
      
      // Log alert as audit record
      await this.logAuditRecord({
        action: 'alert_created',
        tier: 'audit',
        actor: 'system',
        severity: 'warning',
        description: `Alert created: ${alert.description}`,
        metadata: {
          alertId: alert.id,
          alertType: alert.type,
          alertSeverity: alert.severity
        }
      });
      
      console.log(`Alert created: ${alert.type} - ${alert.description}`);
      
      return alert;
    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  }

  /**
   * Generate alert ID
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(filters = {}) {
    let alerts = Array.from(this.activeAlerts.values());
    
    if (filters.type) {
      alerts = alerts.filter(alert => alert.type === filters.type);
    }
    
    if (filters.severity) {
      alerts = alerts.filter(alert => alert.severity === filters.severity);
    }
    
    if (filters.actor) {
      alerts = alerts.filter(alert => alert.actor === filters.actor);
    }
    
    return alerts.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId, resolvedBy, resolution) {
    try {
      const alert = this.activeAlerts.get(alertId);
      if (!alert) {
        throw new Error('Alert not found');
      }
      
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      alert.resolvedBy = resolvedBy;
      alert.resolution = resolution;
      
      // Log resolution as audit record
      await this.logAuditRecord({
        action: 'alert_resolved',
        tier: 'audit',
        actor: resolvedBy,
        severity: 'info',
        description: `Alert resolved: ${alert.description}`,
        metadata: {
          alertId,
          alertType: alert.type,
          resolution
        }
      });
      
      // Remove from active alerts after some time
      setTimeout(() => {
        this.activeAlerts.delete(alertId);
      }, 24 * 60 * 60 * 1000); // Remove after 24 hours
      
      return alert;
    } catch (error) {
      console.error('Error resolving alert:', error);
      throw error;
    }
  }

  /**
   * Get audit timeline
   */
  async getAuditTimeline(filters = {}) {
    try {
      const { records } = await this.databaseService.getAuditRecords(filters, { limit: 1000 });
      
      const timeline = records.map(record => ({
        timestamp: record.timestamp,
        action: record.action,
        tier: record.tier,
        actor: record.actor,
        severity: record.severity,
        description: record.description
      }));
      
      return timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('Error getting audit timeline:', error);
      throw error;
    }
  }

  /**
   * Calculate energy usage for audit operations
   */
  calculateEnergyUsage(operation, processingTimeMs) {
    const baseFactors = {
      log_audit: 0.01,
      get_audit_records: 0.05,
      verify_integrity: 0.1,
      generate_report: 0.2
    };
    
    const baseFactor = baseFactors[operation] || 0.01;
    return (processingTimeMs / 1000) * baseFactor;
  }

  /**
   * Health check for audit service
   */
  async healthCheck() {
    try {
      const queueSize = this.auditQueue.length;
      const activeAlertsCount = this.activeAlerts.size;
      const recentRecords = await this.getAuditRecords({
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }, { limit: 1 });
      
      return {
        healthy: true,
        initialized: this.initialized,
        queueSize,
        processingQueue: this.processingQueue,
        activeAlerts: activeAlertsCount,
        recordsLast24h: recentRecords.total,
        alertThresholds: this.alertThresholds
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

module.exports = AuditService;