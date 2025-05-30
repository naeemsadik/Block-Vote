const express = require('express');
const router = express.Router();
const EnergyService = require('../services/energyService');
const DatabaseService = require('../services/databaseService');
const fs = require('fs').promises;
const path = require('path');

// Initialize services
const energyService = new EnergyService();
const dbService = new DatabaseService();

/**
 * @route GET /api/energy/metrics
 * @desc Get comprehensive energy statistics
 */
router.get('/metrics', async (req, res) => {
  try {
    const { tier = 'all', timeframe = '24h' } = req.query;
    
    let stats;
    
    switch (tier) {
      case 'constituency':
        stats = await energyService.getConstituencyEnergyStats(timeframe);
        break;
      case 'division':
        stats = await energyService.getDivisionEnergyStats(timeframe);
        break;
      case 'national':
        stats = await energyService.getNationalEnergyStats(timeframe);
        break;
      default:
        stats = await energyService.getAllTierEnergyStats(timeframe);
    }
    
    res.json({
      success: true,
      data: {
        tier,
        timeframe,
        statistics: stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching energy metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch energy metrics',
      message: error.message
    });
  }
});

/**
 * @route GET /api/energy/consumption
 * @desc Get real-time energy consumption data
 */
router.get('/consumption', async (req, res) => {
  try {
    const { interval = '1h', limit = 24 } = req.query;
    
    const consumptionData = await energyService.getConsumptionHistory({
      interval,
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      data: {
        consumption: consumptionData,
        interval,
        dataPoints: consumptionData.length
      }
    });
  } catch (error) {
    console.error('Error fetching consumption data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch consumption data',
      message: error.message
    });
  }
});

/**
 * @route GET /api/energy/efficiency
 * @desc Get energy efficiency metrics
 */
router.get('/efficiency', async (req, res) => {
  try {
    const efficiencyMetrics = await energyService.calculateEfficiencyMetrics();
    const baseline = await energyService.getBaselineComparison();
    
    res.json({
      success: true,
      data: {
        efficiency: efficiencyMetrics,
        baseline,
        savings: {
          percentage: ((baseline.traditional - efficiencyMetrics.current) / baseline.traditional * 100).toFixed(2),
          absolute: (baseline.traditional - efficiencyMetrics.current).toFixed(4),
          unit: 'kWh'
        }
      }
    });
  } catch (error) {
    console.error('Error calculating efficiency:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate efficiency metrics',
      message: error.message
    });
  }
});

/**
 * @route GET /api/energy/per-vote
 * @desc Get energy consumption per vote
 */
router.get('/per-vote', async (req, res) => {
  try {
    const { tier = 'all' } = req.query;
    
    const perVoteData = await energyService.getEnergyPerVote(tier);
    
    res.json({
      success: true,
      data: {
        tier,
        energyPerVote: perVoteData,
        unit: 'kWh/vote'
      }
    });
  } catch (error) {
    console.error('Error calculating energy per vote:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate energy per vote',
      message: error.message
    });
  }
});

/**
 * @route POST /api/energy/record
 * @desc Record energy consumption manually
 */
router.post('/record', async (req, res) => {
  try {
    const {
      tier,
      operation,
      gasUsed,
      energyConsumed,
      transactionHash,
      metadata
    } = req.body;
    
    if (!tier || !operation || (!gasUsed && !energyConsumed)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tier, operation, and either gasUsed or energyConsumed'
      });
    }
    
    const recordId = await energyService.recordEnergyConsumption({
      tier,
      operation,
      gasUsed: gasUsed || 0,
      energyConsumed: energyConsumed || await energyService.gasToEnergy(gasUsed || 0),
      transactionHash,
      metadata: metadata || {},
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      data: {
        recordId,
        tier,
        operation,
        recorded: true
      }
    });
  } catch (error) {
    console.error('Error recording energy consumption:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record energy consumption',
      message: error.message
    });
  }
});

/**
 * @route GET /api/energy/report
 * @desc Generate comprehensive energy report
 */
router.get('/report', async (req, res) => {
  try {
    const { format = 'json', period = '7d' } = req.query;
    
    const report = await energyService.generateEnergyReport(period);
    
    if (format === 'csv') {
      const csvData = await energyService.convertReportToCSV(report);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=energy_report_${period}.csv`);
      res.send(csvData);
    } else if (format === 'pdf') {
      const pdfBuffer = await energyService.generatePDFReport(report);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=energy_report_${period}.pdf`);
      res.send(pdfBuffer);
    } else {
      res.json({
        success: true,
        data: {
          report,
          period,
          generatedAt: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    console.error('Error generating energy report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate energy report',
      message: error.message
    });
  }
});

/**
 * @route GET /api/energy/comparison
 * @desc Compare energy usage with traditional voting systems
 */
router.get('/comparison', async (req, res) => {
  try {
    const { voterCount, constituencyCount } = req.query;
    
    const comparison = await energyService.compareWithTraditional({
      voterCount: parseInt(voterCount) || 1000000,
      constituencyCount: parseInt(constituencyCount) || 100
    });
    
    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('Error generating comparison:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate energy comparison',
      message: error.message
    });
  }
});

/**
 * @route GET /api/energy/live
 * @desc Get live energy monitoring data
 */
router.get('/live', async (req, res) => {
  try {
    const liveData = await energyService.getLiveEnergyData();
    
    res.json({
      success: true,
      data: {
        live: liveData,
        timestamp: new Date().toISOString(),
        refreshRate: '30s'
      }
    });
  } catch (error) {
    console.error('Error fetching live data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch live energy data',
      message: error.message
    });
  }
});

/**
 * @route GET /api/energy/trends
 * @desc Get energy consumption trends
 */
router.get('/trends', async (req, res) => {
  try {
    const { period = '30d', granularity = 'daily' } = req.query;
    
    const trends = await energyService.getEnergyTrends({
      period,
      granularity
    });
    
    res.json({
      success: true,
      data: {
        trends,
        period,
        granularity,
        dataPoints: trends.length
      }
    });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch energy trends',
      message: error.message
    });
  }
});

/**
 * @route POST /api/energy/upload-report
 * @desc Upload external energy report file
 */
router.post('/upload-report', async (req, res) => {
  try {
    const { reportData, source, format } = req.body;
    
    if (!reportData || !source) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: reportData and source'
      });
    }
    
    const processedData = await energyService.processExternalReport({
      data: reportData,
      source,
      format: format || 'csv'
    });
    
    res.json({
      success: true,
      data: {
        processed: true,
        recordsImported: processedData.recordCount,
        source,
        importedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error uploading report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload energy report',
      message: error.message
    });
  }
});

/**
 * @route GET /api/energy/carbon-footprint
 * @desc Calculate carbon footprint of the voting system
 */
router.get('/carbon-footprint', async (req, res) => {
  try {
    const { region = 'global' } = req.query;
    
    const carbonFootprint = await energyService.calculateCarbonFootprint(region);
    
    res.json({
      success: true,
      data: {
        carbonFootprint,
        region,
        unit: 'kg CO2 equivalent',
        calculatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error calculating carbon footprint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate carbon footprint',
      message: error.message
    });
  }
});

/**
 * @route GET /api/energy/optimization
 * @desc Get energy optimization recommendations
 */
router.get('/optimization', async (req, res) => {
  try {
    const recommendations = await energyService.getOptimizationRecommendations();
    
    res.json({
      success: true,
      data: {
        recommendations,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating optimization recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate optimization recommendations',
      message: error.message
    });
  }
});

/**
 * @route POST /api/energy/benchmark
 * @desc Set or update energy benchmarks
 */
router.post('/benchmark', async (req, res) => {
  try {
    const { tier, operation, targetEnergy, description } = req.body;
    
    if (!tier || !operation || !targetEnergy) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tier, operation, targetEnergy'
      });
    }
    
    const benchmarkId = await energyService.setBenchmark({
      tier,
      operation,
      targetEnergy,
      description: description || '',
      setAt: new Date()
    });
    
    res.json({
      success: true,
      data: {
        benchmarkId,
        tier,
        operation,
        targetEnergy,
        set: true
      }
    });
  } catch (error) {
    console.error('Error setting benchmark:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set energy benchmark',
      message: error.message
    });
  }
});

/**
 * @route GET /api/energy/benchmarks
 * @desc Get all energy benchmarks
 */
router.get('/benchmarks', async (req, res) => {
  try {
    const benchmarks = await energyService.getAllBenchmarks();
    
    res.json({
      success: true,
      data: {
        benchmarks,
        count: benchmarks.length
      }
    });
  } catch (error) {
    console.error('Error fetching benchmarks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch energy benchmarks',
      message: error.message
    });
  }
});

module.exports = router;