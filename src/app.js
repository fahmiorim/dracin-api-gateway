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
import dramaboxRoutes from './routes/dramabox.js';
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
app.use('/dramabox', tenantApiKeyAuth, tenantRateLimit, dramaboxRoutes);
app.use('/reelshort', tenantApiKeyAuth, tenantRateLimit, reelshortRoutes);
app.use('/melolo', tenantApiKeyAuth, tenantRateLimit, meloloRoutes);
app.use('/dramabite', tenantApiKeyAuth, tenantRateLimit, dramabiteRoutes);

// Admin routes - requires admin authentication
app.use('/api/admin', adminRoutes);

// Swagger UI - protected with admin API key
// Only protect root path; static assets (CSS/JS) must pass through freely
const swaggerAuthMiddleware = (req, res, next) => {
  const isAsset = req.path !== '/' && req.path !== '';
  if (isAsset) return next();

  const key = req.headers['x-api-key'] || req.query.api_key;
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey || key === adminKey) return next();
  return res.status(401).send(`
    <html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f9fafb">
    <div style="text-align:center;border:1px solid #e5e7eb;padding:40px;border-radius:12px;background:white">
      <h2 style="margin:0 0 8px">API Docs</h2>
      <p style="color:#6b7280;margin:0 0 20px">Requires admin API key</p>
      <form>
        <input name="api_key" type="password" placeholder="Enter admin API key"
          style="padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;width:260px">
        <button type="submit"
          style="margin-left:8px;padding:8px 16px;background:#4f6ef7;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px">
          Access
        </button>
      </form>
    </div></body></html>
  `);
};

if (swaggerDocument) {
  app.use('/docs', swaggerAuthMiddleware, swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Dracin API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      tryItOutEnabled: true
    }
  }));

  app.get('/', (req, res) => {
    res.json({
      name: 'Dracin API Gateway',
      version: '1.0.0',
      status: 'running',
      documentation: '/docs'
    });
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      name: 'Dracin API Gateway',
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
