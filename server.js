/**
 * BlockVote Green Computing - Main Server Entry Point
 * 
 * This is the main server file that initializes and starts the BlockVote
 * hierarchical blockchain voting system with comprehensive energy monitoring,
 * audit trails, and multi-tier blockchain integration.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import services
const databaseService = require('./backend/services/databaseService');
const energyService = require('./backend/services/energyService');
const auditService = require('./backend/services/auditService');
const rollupService = require('./backend/services/rollupService');
const blockchainService = require('./backend/services/blockchainService');

// Import routes
const constituencyRoutes = require('./backend/routes/constituency');
const divisionRoutes = require('./backend/routes/division');
const nationalRoutes = require('./backend/routes/national');
const energyRoutes = require('./backend/routes/energy');
const auditRoutes = require('./backend/routes/audit');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ===========================================
// MIDDLEWARE CONFIGURATION
// ===========================================

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: process.env.CORS_CREDENTIALS === 'true' || true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    // Create logs directory if it doesn't exist
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Log to file in production
    const accessLogStream = fs.createWriteStream(
        path.join(logsDir, 'access.log'),
        { flags: 'a' }
    );
    app.use(morgan('combined', { stream: accessLogStream }));
}

// Request timeout middleware
app.use((req, res, next) => {
    req.setTimeout(parseInt(process.env.REQUEST_TIMEOUT) || 30000);
    next();
});

// ===========================================
// HEALTH CHECK ENDPOINT
// ===========================================

app.get('/health', async (req, res) => {
    try {
        const healthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: NODE_ENV,
            version: process.env.npm_package_version || '1.0.0',
            services: {
                database: 'checking...',
                energy: 'checking...',
                audit: 'checking...',
                rollup: 'checking...',
                blockchain: 'checking...'
            },
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                external: Math.round(process.memoryUsage().external / 1024 / 1024)
            }
        };

        // Check service health
        try {
            await databaseService.healthCheck();
            healthStatus.services.database = 'healthy';
        } catch (error) {
            healthStatus.services.database = 'unhealthy';
            healthStatus.status = 'degraded';
        }

        try {
            await energyService.healthCheck();
            healthStatus.services.energy = 'healthy';
        } catch (error) {
            healthStatus.services.energy = 'unhealthy';
            healthStatus.status = 'degraded';
        }

        try {
            await auditService.healthCheck();
            healthStatus.services.audit = 'healthy';
        } catch (error) {
            healthStatus.services.audit = 'unhealthy';
            healthStatus.status = 'degraded';
        }

        try {
            await rollupService.healthCheck();
            healthStatus.services.rollup = 'healthy';
        } catch (error) {
            healthStatus.services.rollup = 'unhealthy';
            healthStatus.status = 'degraded';
        }

        try {
            await blockchainService.healthCheck();
            healthStatus.services.blockchain = 'healthy';
        } catch (error) {
            healthStatus.services.blockchain = 'unhealthy';
            healthStatus.status = 'degraded';
        }

        const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(healthStatus);
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// ===========================================
// API ROUTES
// ===========================================

const API_VERSION = process.env.API_VERSION || 'v1';
const API_BASE = `/api/${API_VERSION}`;

// Mount route handlers
app.use(`${API_BASE}/constituency`, constituencyRoutes);
app.use(`${API_BASE}/division`, divisionRoutes);
app.use(`${API_BASE}/national`, nationalRoutes);
app.use(`${API_BASE}/energy`, energyRoutes);
app.use(`${API_BASE}/audit`, auditRoutes);

// API documentation endpoint
app.get(`${API_BASE}/docs`, (req, res) => {
    res.json({
        name: 'BlockVote Green Computing API',
        version: API_VERSION,
        description: 'Hierarchical blockchain voting system with energy monitoring',
        endpoints: {
            constituency: {
                base: `${API_BASE}/constituency`,
                endpoints: [
                    'POST /register - Register voter',
                    'POST /vote - Cast vote',
                    'GET /results - Get constituency results',
                    'POST /candidates - Add candidate',
                    'GET /stats - Get constituency statistics'
                ]
            },
            division: {
                base: `${API_BASE}/division`,
                endpoints: [
                    'POST /submit-results - Submit constituency results',
                    'POST /process-batch - Process rollup batch',
                    'GET /stats - Get division statistics',
                    'GET /batches - Get rollup batch history'
                ]
            },
            national: {
                base: `${API_BASE}/national`,
                endpoints: [
                    'POST /finalize - Finalize national results',
                    'GET /results - Get national results',
                    'GET /audit - Get national audit trail',
                    'GET /stats - Get national statistics'
                ]
            },
            energy: {
                base: `${API_BASE}/energy`,
                endpoints: [
                    'GET /stats - Get energy statistics',
                    'GET /report - Generate energy report',
                    'GET /carbon-footprint - Calculate carbon footprint',
                    'GET /live - Get real-time energy data'
                ]
            },
            audit: {
                base: `${API_BASE}/audit`,
                endpoints: [
                    'GET /trail - Get complete audit trail',
                    'GET /actor/:address - Get actor-specific audit',
                    'GET /alerts - Get active security alerts',
                    'POST /alerts/:id/resolve - Resolve security alerts'
                ]
            }
        },
        features: [
            'Hierarchical blockchain architecture',
            'Real-time energy monitoring',
            'Comprehensive audit trails',
            'Rollup batch processing',
            'Multi-signature validation',
            'Carbon footprint analysis'
        ]
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'BlockVote Green Computing',
        description: 'Hierarchical blockchain voting system with energy efficiency',
        version: process.env.npm_package_version || '1.0.0',
        environment: NODE_ENV,
        api: {
            base: API_BASE,
            docs: `${API_BASE}/docs`,
            health: '/health'
        },
        features: {
            energyTracking: process.env.ENERGY_TRACKING_ENABLED === 'true',
            auditEnabled: process.env.AUDIT_ENABLED === 'true',
            rollupAutoProcess: process.env.ROLLUP_AUTO_PROCESS === 'true'
        }
    });
});

// ===========================================
// ERROR HANDLING MIDDLEWARE
// ===========================================

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: `The requested endpoint ${req.originalUrl} does not exist`,
        availableEndpoints: {
            api: API_BASE,
            docs: `${API_BASE}/docs`,
            health: '/health'
        }
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    
    // Log error to audit service
    if (auditService && auditService.logAuditRecord) {
        auditService.logAuditRecord({
            action: 'server_error',
            actor: req.ip || 'unknown',
            target: req.originalUrl,
            metadata: {
                method: req.method,
                userAgent: req.get('User-Agent'),
                error: error.message,
                stack: NODE_ENV === 'development' ? error.stack : undefined
            },
            severity: 'error'
        }).catch(auditError => {
            console.error('Failed to log error to audit service:', auditError);
        });
    }
    
    const statusCode = error.statusCode || error.status || 500;
    const response = {
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method
    };
    
    if (NODE_ENV === 'development') {
        response.stack = error.stack;
    }
    
    res.status(statusCode).json(response);
});

// ===========================================
// SERVER INITIALIZATION
// ===========================================

async function initializeServices() {
    console.log('🚀 Initializing BlockVote services...');
    
    try {
        // Initialize database service
        console.log('📊 Initializing database service...');
        await databaseService.initialize();
        console.log('✅ Database service initialized');
        
        // Initialize energy service
        console.log('⚡ Initializing energy service...');
        await energyService.initialize();
        console.log('✅ Energy service initialized');
        
        // Initialize audit service
        console.log('🔍 Initializing audit service...');
        await auditService.initialize();
        console.log('✅ Audit service initialized');
        
        // Initialize rollup service
        console.log('📦 Initializing rollup service...');
        await rollupService.initialize();
        console.log('✅ Rollup service initialized');
        
        // Initialize blockchain service
        console.log('⛓️  Initializing blockchain service...');
        await blockchainService.initialize();
        console.log('✅ Blockchain service initialized');
        
        console.log('🎉 All services initialized successfully!');
        
        // Log system startup
        await auditService.logAuditRecord({
            action: 'system_startup',
            actor: 'system',
            target: 'server',
            metadata: {
                version: process.env.npm_package_version || '1.0.0',
                environment: NODE_ENV,
                port: PORT,
                features: {
                    energyTracking: process.env.ENERGY_TRACKING_ENABLED === 'true',
                    auditEnabled: process.env.AUDIT_ENABLED === 'true',
                    rollupAutoProcess: process.env.ROLLUP_AUTO_PROCESS === 'true'
                }
            },
            severity: 'info'
        });
        
    } catch (error) {
        console.error('❌ Failed to initialize services:', error);
        process.exit(1);
    }
}

async function startServer() {
    try {
        // Initialize all services
        await initializeServices();
        
        // Start the server
        const server = app.listen(PORT, () => {
            console.log(`\n🌱 BlockVote Green Computing Server`);
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`🌍 Environment: ${NODE_ENV}`);
            console.log(`📡 API Base: ${API_BASE}`);
            console.log(`📚 API Docs: http://localhost:${PORT}${API_BASE}/docs`);
            console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
            console.log(`\n⚡ Features enabled:`);
            console.log(`   🔋 Energy Tracking: ${process.env.ENERGY_TRACKING_ENABLED === 'true' ? '✅' : '❌'}`);
            console.log(`   🔍 Audit System: ${process.env.AUDIT_ENABLED === 'true' ? '✅' : '❌'}`);
            console.log(`   📦 Auto Rollup: ${process.env.ROLLUP_AUTO_PROCESS === 'true' ? '✅' : '❌'}`);
            console.log(`\n🎯 Ready to accept requests!\n`);
        });
        
        // Configure server timeouts
        server.keepAliveTimeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT) || 5000;
        server.headersTimeout = server.keepAliveTimeout + 1000;
        
        // Graceful shutdown handling
        const gracefulShutdown = async (signal) => {
            console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
            
            // Log shutdown
            try {
                await auditService.logAuditRecord({
                    action: 'system_shutdown',
                    actor: 'system',
                    target: 'server',
                    metadata: {
                        signal,
                        uptime: process.uptime()
                    },
                    severity: 'info'
                });
            } catch (error) {
                console.error('Failed to log shutdown:', error);
            }
            
            server.close(() => {
                console.log('✅ HTTP server closed');
                
                // Close database connections and cleanup
                Promise.all([
                    databaseService.cleanup?.(),
                    energyService.cleanup?.(),
                    auditService.cleanup?.(),
                    rollupService.cleanup?.(),
                    blockchainService.cleanup?.()
                ]).then(() => {
                    console.log('✅ All services cleaned up');
                    console.log('👋 Goodbye!');
                    process.exit(0);
                }).catch((error) => {
                    console.error('❌ Error during cleanup:', error);
                    process.exit(1);
                });
            });
        };
        
        // Handle shutdown signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('❌ Uncaught Exception:', error);
            gracefulShutdown('UNCAUGHT_EXCEPTION');
        });
        
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
            gracefulShutdown('UNHANDLED_REJECTION');
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
if (require.main === module) {
    startServer();
}

module.exports = app;