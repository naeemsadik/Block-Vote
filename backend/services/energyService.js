const fs = require('fs').promises;
const path = require('path');

class EnergyService {
  constructor() {
    this.energyData = [];
    this.benchmarks = new Map();
    this.carbonFactors = {
      global: 0.5, // kg CO2 per kWh (global average)
      us: 0.4,
      eu: 0.3,
      china: 0.6,
      india: 0.7
    };
    this.gasToEnergyRatio = 0.000000001; // kWh per gas unit (simplified)
  }

  /**
   * Record energy consumption for a specific operation
   */
  async recordEnergyConsumption(data) {
    const record = {
      id: this.generateId(),
      tier: data.tier,
      operation: data.operation,
      gasUsed: data.gasUsed || 0,
      energyConsumed: data.energyConsumed || await this.gasToEnergy(data.gasUsed || 0),
      transactionHash: data.transactionHash || null,
      metadata: data.metadata || {},
      timestamp: data.timestamp || new Date()
    };

    this.energyData.push(record);
    
    // Persist to file
    await this.persistEnergyData();
    
    return record.id;
  }

  /**
   * Convert gas units to energy (kWh)
   */
  async gasToEnergy(gasUnits) {
    return gasUnits * this.gasToEnergyRatio;
  }

  /**
   * Get constituency energy statistics
   */
  async getConstituencyEnergyStats(timeframe = '24h') {
    const cutoffTime = this.getTimeframeCutoff(timeframe);
    const constituencyData = this.energyData.filter(
      record => record.tier === 'constituency' && record.timestamp >= cutoffTime
    );

    return this.calculateTierStats(constituencyData, 'constituency');
  }

  /**
   * Get division energy statistics
   */
  async getDivisionEnergyStats(timeframe = '24h') {
    const cutoffTime = this.getTimeframeCutoff(timeframe);
    const divisionData = this.energyData.filter(
      record => record.tier === 'division' && record.timestamp >= cutoffTime
    );

    return this.calculateTierStats(divisionData, 'division');
  }

  /**
   * Get national energy statistics
   */
  async getNationalEnergyStats(timeframe = '24h') {
    const cutoffTime = this.getTimeframeCutoff(timeframe);
    const nationalData = this.energyData.filter(
      record => record.tier === 'national' && record.timestamp >= cutoffTime
    );

    return this.calculateTierStats(nationalData, 'national');
  }

  /**
   * Get all tier energy statistics
   */
  async getAllTierEnergyStats(timeframe = '24h') {
    const cutoffTime = this.getTimeframeCutoff(timeframe);
    const filteredData = this.energyData.filter(record => record.timestamp >= cutoffTime);

    const tierStats = {
      constituency: this.calculateTierStats(
        filteredData.filter(r => r.tier === 'constituency'),
        'constituency'
      ),
      division: this.calculateTierStats(
        filteredData.filter(r => r.tier === 'division'),
        'division'
      ),
      national: this.calculateTierStats(
        filteredData.filter(r => r.tier === 'national'),
        'national'
      )
    };

    // Calculate total stats
    const totalEnergy = Object.values(tierStats).reduce((sum, tier) => sum + tier.totalEnergy, 0);
    const totalGas = Object.values(tierStats).reduce((sum, tier) => sum + tier.totalGas, 0);
    const totalOperations = Object.values(tierStats).reduce((sum, tier) => sum + tier.operationCount, 0);

    return {
      ...tierStats,
      total: {
        totalEnergy,
        totalGas,
        operationCount: totalOperations,
        averageEnergyPerOperation: totalOperations > 0 ? totalEnergy / totalOperations : 0,
        timeframe
      }
    };
  }

  /**
   * Calculate statistics for a specific tier
   */
  calculateTierStats(data, tier) {
    if (data.length === 0) {
      return {
        tier,
        totalEnergy: 0,
        totalGas: 0,
        operationCount: 0,
        averageEnergyPerOperation: 0,
        operationBreakdown: {}
      };
    }

    const totalEnergy = data.reduce((sum, record) => sum + record.energyConsumed, 0);
    const totalGas = data.reduce((sum, record) => sum + record.gasUsed, 0);
    const operationCount = data.length;

    // Operation breakdown
    const operationBreakdown = {};
    data.forEach(record => {
      if (!operationBreakdown[record.operation]) {
        operationBreakdown[record.operation] = {
          count: 0,
          totalEnergy: 0,
          totalGas: 0
        };
      }
      operationBreakdown[record.operation].count++;
      operationBreakdown[record.operation].totalEnergy += record.energyConsumed;
      operationBreakdown[record.operation].totalGas += record.gasUsed;
    });

    return {
      tier,
      totalEnergy,
      totalGas,
      operationCount,
      averageEnergyPerOperation: totalEnergy / operationCount,
      operationBreakdown
    };
  }

  /**
   * Get consumption history with specified interval
   */
  async getConsumptionHistory(options = {}) {
    const { interval = '1h', limit = 24 } = options;
    const intervalMs = this.parseInterval(interval);
    const now = new Date();
    
    const history = [];
    for (let i = 0; i < limit; i++) {
      const endTime = new Date(now.getTime() - (i * intervalMs));
      const startTime = new Date(endTime.getTime() - intervalMs);
      
      const periodData = this.energyData.filter(
        record => record.timestamp >= startTime && record.timestamp < endTime
      );
      
      const totalEnergy = periodData.reduce((sum, record) => sum + record.energyConsumed, 0);
      const totalGas = periodData.reduce((sum, record) => sum + record.gasUsed, 0);
      
      history.unshift({
        timestamp: endTime.toISOString(),
        period: `${startTime.toISOString()} - ${endTime.toISOString()}`,
        totalEnergy,
        totalGas,
        operationCount: periodData.length
      });
    }
    
    return history;
  }

  /**
   * Calculate efficiency metrics
   */
  async calculateEfficiencyMetrics() {
    const recentData = this.energyData.filter(
      record => record.timestamp >= new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    if (recentData.length === 0) {
      return {
        current: 0,
        trend: 'stable',
        efficiency: 100
      };
    }

    const totalEnergy = recentData.reduce((sum, record) => sum + record.energyConsumed, 0);
    const totalOperations = recentData.length;
    const averageEnergyPerOperation = totalEnergy / totalOperations;

    // Compare with previous period
    const previousData = this.energyData.filter(
      record => {
        const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return record.timestamp >= twoDaysAgo && record.timestamp < oneDayAgo;
      }
    );

    let trend = 'stable';
    if (previousData.length > 0) {
      const previousAverage = previousData.reduce((sum, record) => sum + record.energyConsumed, 0) / previousData.length;
      if (averageEnergyPerOperation > previousAverage * 1.1) {
        trend = 'increasing';
      } else if (averageEnergyPerOperation < previousAverage * 0.9) {
        trend = 'decreasing';
      }
    }

    return {
      current: totalEnergy,
      averagePerOperation: averageEnergyPerOperation,
      trend,
      efficiency: Math.max(0, 100 - (averageEnergyPerOperation * 1000)) // Simplified efficiency calculation
    };
  }

  /**
   * Get baseline comparison with traditional voting systems
   */
  async getBaselineComparison() {
    // Simplified baseline calculations
    const traditionalVotingEnergy = 50; // kWh per 1000 votes (estimated)
    const currentSystemEnergy = this.energyData.reduce((sum, record) => sum + record.energyConsumed, 0);
    
    return {
      traditional: traditionalVotingEnergy,
      current: currentSystemEnergy,
      savings: traditionalVotingEnergy - currentSystemEnergy,
      efficiency: ((traditionalVotingEnergy - currentSystemEnergy) / traditionalVotingEnergy) * 100
    };
  }

  /**
   * Get energy consumption per vote
   */
  async getEnergyPerVote(tier = 'all') {
    let data = this.energyData;
    if (tier !== 'all') {
      data = data.filter(record => record.tier === tier);
    }

    const voteOperations = data.filter(record => 
      record.operation.includes('vote') || record.operation.includes('cast')
    );

    if (voteOperations.length === 0) {
      return {
        energyPerVote: 0,
        totalVotes: 0,
        totalEnergy: 0
      };
    }

    const totalEnergy = voteOperations.reduce((sum, record) => sum + record.energyConsumed, 0);
    const totalVotes = voteOperations.length;

    return {
      energyPerVote: totalEnergy / totalVotes,
      totalVotes,
      totalEnergy,
      tier
    };
  }

  /**
   * Generate comprehensive energy report
   */
  async generateEnergyReport(period = '7d') {
    const cutoffTime = this.getTimeframeCutoff(period);
    const periodData = this.energyData.filter(record => record.timestamp >= cutoffTime);

    const report = {
      period,
      generatedAt: new Date().toISOString(),
      summary: {
        totalEnergy: periodData.reduce((sum, record) => sum + record.energyConsumed, 0),
        totalGas: periodData.reduce((sum, record) => sum + record.gasUsed, 0),
        totalOperations: periodData.length,
        uniqueOperationTypes: [...new Set(periodData.map(r => r.operation))].length
      },
      tierBreakdown: {
        constituency: this.calculateTierStats(periodData.filter(r => r.tier === 'constituency'), 'constituency'),
        division: this.calculateTierStats(periodData.filter(r => r.tier === 'division'), 'division'),
        national: this.calculateTierStats(periodData.filter(r => r.tier === 'national'), 'national')
      },
      trends: await this.getEnergyTrends({ period, granularity: 'daily' }),
      efficiency: await this.calculateEfficiencyMetrics(),
      carbonFootprint: await this.calculateCarbonFootprint('global'),
      recommendations: await this.getOptimizationRecommendations()
    };

    return report;
  }

  /**
   * Compare with traditional voting systems
   */
  async compareWithTraditional(options = {}) {
    const { voterCount = 1000000, constituencyCount = 100 } = options;
    
    // Traditional voting energy estimates (simplified)
    const traditionalEnergy = {
      paperBallots: voterCount * 0.001, // kWh per voter for paper processing
      transportation: constituencyCount * 50, // kWh per constituency for transportation
      counting: constituencyCount * 10, // kWh per constituency for counting
      total: 0
    };
    traditionalEnergy.total = traditionalEnergy.paperBallots + traditionalEnergy.transportation + traditionalEnergy.counting;

    // Current system energy
    const currentEnergy = this.energyData.reduce((sum, record) => sum + record.energyConsumed, 0);
    
    return {
      traditional: traditionalEnergy,
      blockchain: {
        total: currentEnergy,
        perVote: currentEnergy / Math.max(1, voterCount)
      },
      savings: {
        absolute: traditionalEnergy.total - currentEnergy,
        percentage: ((traditionalEnergy.total - currentEnergy) / traditionalEnergy.total) * 100,
        carbonReduction: (traditionalEnergy.total - currentEnergy) * this.carbonFactors.global
      },
      scalability: {
        traditionalGrowth: 'linear',
        blockchainGrowth: 'logarithmic',
        breakEvenPoint: Math.ceil(traditionalEnergy.total / (currentEnergy / Math.max(1, voterCount)))
      }
    };
  }

  /**
   * Get live energy monitoring data
   */
  async getLiveEnergyData() {
    const last5Minutes = new Date(Date.now() - 5 * 60 * 1000);
    const recentData = this.energyData.filter(record => record.timestamp >= last5Minutes);
    
    const currentRate = recentData.reduce((sum, record) => sum + record.energyConsumed, 0);
    const operationRate = recentData.length;
    
    return {
      currentEnergyRate: currentRate, // kWh in last 5 minutes
      operationRate: operationRate, // operations in last 5 minutes
      projectedHourlyConsumption: (currentRate / 5) * 60,
      activeTiers: [...new Set(recentData.map(r => r.tier))],
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Get energy consumption trends
   */
  async getEnergyTrends(options = {}) {
    const { period = '30d', granularity = 'daily' } = options;
    const cutoffTime = this.getTimeframeCutoff(period);
    const intervalMs = this.parseInterval(granularity === 'daily' ? '1d' : '1h');
    
    const trends = [];
    const now = new Date();
    const dataPoints = granularity === 'daily' ? 30 : 24;
    
    for (let i = 0; i < dataPoints; i++) {
      const endTime = new Date(now.getTime() - (i * intervalMs));
      const startTime = new Date(endTime.getTime() - intervalMs);
      
      const periodData = this.energyData.filter(
        record => record.timestamp >= startTime && record.timestamp < endTime
      );
      
      trends.unshift({
        timestamp: endTime.toISOString(),
        energy: periodData.reduce((sum, record) => sum + record.energyConsumed, 0),
        operations: periodData.length,
        gas: periodData.reduce((sum, record) => sum + record.gasUsed, 0)
      });
    }
    
    return trends;
  }

  /**
   * Calculate carbon footprint
   */
  async calculateCarbonFootprint(region = 'global') {
    const totalEnergy = this.energyData.reduce((sum, record) => sum + record.energyConsumed, 0);
    const carbonFactor = this.carbonFactors[region] || this.carbonFactors.global;
    
    return {
      totalEnergy,
      carbonFactor,
      totalCarbon: totalEnergy * carbonFactor,
      region,
      breakdown: {
        constituency: this.energyData
          .filter(r => r.tier === 'constituency')
          .reduce((sum, record) => sum + record.energyConsumed, 0) * carbonFactor,
        division: this.energyData
          .filter(r => r.tier === 'division')
          .reduce((sum, record) => sum + record.energyConsumed, 0) * carbonFactor,
        national: this.energyData
          .filter(r => r.tier === 'national')
          .reduce((sum, record) => sum + record.energyConsumed, 0) * carbonFactor
      }
    };
  }

  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations() {
    const recommendations = [];
    
    // Analyze recent energy patterns
    const recentData = this.energyData.filter(
      record => record.timestamp >= new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    
    if (recentData.length === 0) {
      return [{
        type: 'info',
        priority: 'low',
        title: 'No recent data',
        description: 'No energy consumption data available for analysis',
        action: 'Start recording energy consumption data'
      }];
    }
    
    // Check for high energy operations
    const operationStats = {};
    recentData.forEach(record => {
      if (!operationStats[record.operation]) {
        operationStats[record.operation] = { count: 0, totalEnergy: 0 };
      }
      operationStats[record.operation].count++;
      operationStats[record.operation].totalEnergy += record.energyConsumed;
    });
    
    const highEnergyOps = Object.entries(operationStats)
      .filter(([op, stats]) => stats.totalEnergy / stats.count > 0.001)
      .sort((a, b) => (b[1].totalEnergy / b[1].count) - (a[1].totalEnergy / a[1].count));
    
    if (highEnergyOps.length > 0) {
      recommendations.push({
        type: 'optimization',
        priority: 'high',
        title: 'High Energy Operations Detected',
        description: `Operations ${highEnergyOps.slice(0, 3).map(([op]) => op).join(', ')} consume significant energy`,
        action: 'Consider optimizing these operations or implementing batch processing'
      });
    }
    
    // Check tier distribution
    const tierEnergy = {
      constituency: recentData.filter(r => r.tier === 'constituency').reduce((sum, r) => sum + r.energyConsumed, 0),
      division: recentData.filter(r => r.tier === 'division').reduce((sum, r) => sum + r.energyConsumed, 0),
      national: recentData.filter(r => r.tier === 'national').reduce((sum, r) => sum + r.energyConsumed, 0)
    };
    
    const totalEnergy = Object.values(tierEnergy).reduce((sum, energy) => sum + energy, 0);
    if (totalEnergy > 0) {
      const constituencyPercentage = (tierEnergy.constituency / totalEnergy) * 100;
      if (constituencyPercentage > 70) {
        recommendations.push({
          type: 'architecture',
          priority: 'medium',
          title: 'Constituency Tier Dominance',
          description: `Constituency tier consumes ${constituencyPercentage.toFixed(1)}% of total energy`,
          action: 'Consider implementing more efficient consensus mechanisms or batch processing'
        });
      }
    }
    
    return recommendations;
  }

  /**
   * Set energy benchmark
   */
  async setBenchmark(benchmark) {
    const id = this.generateId();
    this.benchmarks.set(id, {
      id,
      ...benchmark
    });
    
    await this.persistBenchmarks();
    return id;
  }

  /**
   * Get all benchmarks
   */
  async getAllBenchmarks() {
    return Array.from(this.benchmarks.values());
  }

  /**
   * Record energy for specific tier operations
   */
  async recordConstituencyEnergy(gasUsed) {
    return await this.recordEnergyConsumption({
      tier: 'constituency',
      operation: 'constituency_operation',
      gasUsed
    });
  }

  async recordDivisionEnergy(gasUsed) {
    return await this.recordEnergyConsumption({
      tier: 'division',
      operation: 'division_operation',
      gasUsed
    });
  }

  async recordNationalEnergy(gasUsed) {
    return await this.recordEnergyConsumption({
      tier: 'national',
      operation: 'national_operation',
      gasUsed
    });
  }

  async recordFinalizationEnergy(gasUsed) {
    return await this.recordEnergyConsumption({
      tier: 'national',
      operation: 'finalization',
      gasUsed
    });
  }

  /**
   * Process external energy report
   */
  async processExternalReport(options = {}) {
    const { data, source, format = 'csv' } = options;
    
    // Simplified processing - in real implementation, parse CSV/JSON data
    const recordCount = Array.isArray(data) ? data.length : 1;
    
    return {
      recordCount,
      source,
      processed: true
    };
  }

  /**
   * Convert report to CSV format
   */
  async convertReportToCSV(report) {
    const headers = ['Timestamp', 'Tier', 'Operation', 'Energy (kWh)', 'Gas Used', 'Transaction Hash'];
    const rows = [headers.join(',')];
    
    // Add sample data rows
    rows.push('2024-01-01T00:00:00Z,constituency,vote_cast,0.001,21000,0x123...');
    rows.push('2024-01-01T01:00:00Z,division,rollup_batch,0.005,105000,0x456...');
    
    return rows.join('\n');
  }

  /**
   * Generate PDF report
   */
  async generatePDFReport(report) {
    // Simplified PDF generation - return mock buffer
    return Buffer.from('PDF Report Content', 'utf8');
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get timeframe cutoff date
   */
  getTimeframeCutoff(timeframe) {
    const now = new Date();
    const timeframeMs = this.parseInterval(timeframe);
    return new Date(now.getTime() - timeframeMs);
  }

  /**
   * Parse interval string to milliseconds
   */
  parseInterval(interval) {
    const units = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000,
      'w': 7 * 24 * 60 * 60 * 1000
    };
    
    const match = interval.match(/^(\d+)([smhdw])$/);
    if (!match) {
      throw new Error(`Invalid interval format: ${interval}`);
    }
    
    const [, amount, unit] = match;
    return parseInt(amount) * units[unit];
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Persist energy data to file
   */
  async persistEnergyData() {
    try {
      const dataDir = path.join(__dirname, '../data');
      await fs.mkdir(dataDir, { recursive: true });
      
      const filePath = path.join(dataDir, 'energy_data.json');
      await fs.writeFile(filePath, JSON.stringify(this.energyData, null, 2));
    } catch (error) {
      console.warn('Failed to persist energy data:', error);
    }
  }

  /**
   * Persist benchmarks to file
   */
  async persistBenchmarks() {
    try {
      const dataDir = path.join(__dirname, '../data');
      await fs.mkdir(dataDir, { recursive: true });
      
      const filePath = path.join(dataDir, 'energy_benchmarks.json');
      const benchmarksArray = Array.from(this.benchmarks.values());
      await fs.writeFile(filePath, JSON.stringify(benchmarksArray, null, 2));
    } catch (error) {
      console.warn('Failed to persist benchmarks:', error);
    }
  }

  /**
   * Load persisted data on initialization
   */
  async loadPersistedData() {
    try {
      const dataDir = path.join(__dirname, '../data');
      
      // Load energy data
      try {
        const energyDataPath = path.join(dataDir, 'energy_data.json');
        const energyData = await fs.readFile(energyDataPath, 'utf8');
        this.energyData = JSON.parse(energyData).map(record => ({
          ...record,
          timestamp: new Date(record.timestamp)
        }));
      } catch (error) {
        // File doesn't exist or is invalid, start with empty array
        this.energyData = [];
      }
      
      // Load benchmarks
      try {
        const benchmarksPath = path.join(dataDir, 'energy_benchmarks.json');
        const benchmarksData = await fs.readFile(benchmarksPath, 'utf8');
        const benchmarksArray = JSON.parse(benchmarksData);
        this.benchmarks = new Map(benchmarksArray.map(b => [b.id, b]));
      } catch (error) {
        // File doesn't exist or is invalid, start with empty map
        this.benchmarks = new Map();
      }
    } catch (error) {
      console.warn('Failed to load persisted energy data:', error);
    }
  }
}

module.exports = EnergyService;