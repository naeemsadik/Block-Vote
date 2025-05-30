const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const constituencyRoutes = require('./routes/constituency');
const divisionRoutes = require('./routes/division');
const nationalRoutes = require('./routes/national');
const energyRoutes = require('./routes/energy');
const auditRoutes = require('./routes/audit');
const networkRoutes = require('./routes/network'); // Added network routes

// API Routes
app.use('/api/constituency', constituencyRoutes);
app.use('/api/division', divisionRoutes);
app.use('/api/national', nationalRoutes);
app.use('/api/energy', energyRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/network', networkRoutes); // Added network routes usage

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'BlockVote API',
    version: '1.0.0',
    description: 'Hierarchical blockchain voting system API',
    endpoints: {
      constituency: '/api/constituency',
      division: '/api/division',
      national: '/api/national',
      energy: '/api/energy',
      audit: '/api/audit',
      network: '/api/network', // Added network to API docs
      health: '/api/health'
    },
    documentation: {
      constituency: {
        'GET /api/constituency/contracts': 'Get constituency contract addresses',
        'GET /api/constituency/:id/candidates': 'Get candidates for constituency',
        'GET /api/constituency/:id/results': 'Get voting results for constituency',
        'POST /api/constituency/:id/vote': 'Cast a vote in constituency',
        'GET /api/constituency/:id/voter/:address': 'Get voter information',
        'POST /api/constituency/:id/verify': 'Verify vote with Merkle proof'
      },
      division: {
        'GET /api/division/contracts': 'Get division contract addresses',
        'POST /api/division/submit-rollup': 'Submit constituency rollup',
        'GET /api/division/rollups': 'Get all rollup batches',
        'GET /api/division/rollup/:id': 'Get specific rollup batch',
        'POST /api/division/sign-rollup': 'Sign rollup batch',
        'GET /api/division/validators': 'Get division validators'
      },
      national: {
        'GET /api/national/contracts': 'Get national contract address',
        'POST /api/national/submit-division': 'Submit division results',
        'GET /api/national/results': 'Get national election results',
        'GET /api/national/candidates': 'Get all national candidates',
        'POST /api/national/finalize': 'Finalize national results',
        'GET /api/national/audit-trail': 'Get audit trail'
      },
      energy: {
        'GET /api/energy/stats': 'Get energy consumption statistics',
        'GET /api/energy/report': 'Generate energy report',
        'POST /api/energy/upload': 'Upload energy measurement data'
      },
      audit: {
        'GET /api/audit/trail': 'Get complete audit trail',
        'GET /api/audit/verify/:hash': 'Verify audit record',
        'GET /api/audit/export': 'Export audit data'
      },
      network: { // Added network endpoints to API docs
        'GET /api/network/stats': 'Get current network statistics'
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.errors
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing authentication'
    });
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`\n🚀 BlockVote API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API Documentation: http://localhost:${PORT}/api`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`⚡ Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`\n📝 Available endpoints:`);
    console.log(`   GET  /api - API documentation`);
    console.log(`   GET  /api/health - Health check`);
    console.log(`   GET  /api/constituency/* - Constituency operations`);
    console.log(`   GET  /api/division/* - Division operations`);
    console.log(`   GET  /api/national/* - National operations`);
    console.log(`   GET  /api/energy/* - Energy monitoring`);
    console.log(`   GET  /api/audit/* - Audit trail`);
    console.log(`   GET  /api/network/* - Network statistics`); // Added network to available endpoints log
  }
});

module.exports = app;