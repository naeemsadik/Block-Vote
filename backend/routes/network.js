const express = require('express');
const router = express.Router();

// Mock data for network statistics
const mockNetworkStats = {
  totalNodes: 150,
  activeNodes: 145,
  averageBlockTime: '12s',
  transactionThroughput: '85 tps',
  currentEpoch: 78,
  networkHealth: 'Optimal',
  lastMaintenance: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
};

/**
 * @route   GET /api/network/stats
 * @desc    Get current network statistics
 * @access  Public
 */
router.get('/stats', (req, res) => {
  try {
    // In a real application, you would fetch this data from your blockchain nodes or monitoring services
    res.json(mockNetworkStats);
  } catch (error) {
    console.error('Error fetching network stats:', error);
    res.status(500).json({ message: 'Failed to retrieve network statistics', error: error.message });
  }
});

module.exports = router;