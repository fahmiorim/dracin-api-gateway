import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { config } from './config/index.js';
import logger from './utils/logger.js';
import { requestId } from './middleware/requestId.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiKeyAuth, requestTimeout, tenantApiKeyAuth, tenantRateLimit } from './middleware/auth.js';
import { healthCheck } from './controllers/health.controller.js';
import apiRoutes from './routes/api.js';
import reelshortRoutes from './routes/reelshort.js';
import meloloRoutes from './routes/melolo.js';
import dramabiteRoutes from './routes/dramabite.js';
import adminRoutes from './routes/admin.js';

// Load Swagger specification
let swaggerDocument;
try {
  swaggerDocument = YAML.load('./swagger.yaml');
} catch (error) {
  logger.error('Error loading swagger.yaml:', error.message);
}

// Create Express app
const app = express();

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API
}));

// CORS configuration
app.use(cors(config.cors));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

logger.info('🚀 Dracin API Gateway started', {
  environment: config.NODE_ENV,
  pid: process.pid,
  port: config.PORT,
  service: 'dracin-api-gateway',
  timestamp: new Date().toISOString()
});

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware
app.use(requestId);

// Request timeout middleware
app.use(requestTimeout);

// API Key authentication (optional, only if API_KEY is configured)
if (config.api.key) {
  app.use('/api', apiKeyAuth);
  app.use('/dramabox', apiKeyAuth);
  app.use('/reelshort', apiKeyAuth);
  app.use('/melolo', apiKeyAuth);
  app.use('/dramabite', apiKeyAuth);
}

// Request logging
app.use((req, res, next) => {
  logger.info('Request received', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.id
  });
  next();
});

// Health check endpoint
app.get('/health', healthCheck);

// API routes - MUST be before Swagger UI
app.use('/dramabox', tenantApiKeyAuth, tenantRateLimit, apiRoutes);
app.use('/reelshort', tenantApiKeyAuth, tenantRateLimit, reelshortRoutes);
app.use('/melolo', tenantApiKeyAuth, tenantRateLimit, meloloRoutes);
app.use('/dramabite', tenantApiKeyAuth, tenantRateLimit, dramabiteRoutes);

// Admin routes - requires admin authentication
app.use('/admin', adminRoutes);

// Swagger UI at /docs path (not root to avoid conflicts)
if (swaggerDocument) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Dramabox API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      tryItOutEnabled: true
    }
  }));
  
  // Redirect root to /docs
  app.get('/', (req, res) => {
    res.redirect('/docs');
  });
} else {
  // Fallback if swagger not loaded
  app.get('/', (req, res) => {
    res.json({
      name: 'Dramabox API Gateway',
      version: '1.0.0',
      status: 'running',
      documentation: '/docs (not available)'
    });
  });
}

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

export default app;
