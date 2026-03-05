import logger from '../utils/logger.js';
import { config, isDevelopment } from '../config/index.js';
import { cache } from '../utils/cache.js';
import supabaseService from '../database/supabase.js';

// Fallback in-memory storage for development
const buildFallbackClients = () => {
  const clients = new Map();

  if (process.env.ADMIN_API_KEY) {
    clients.set(process.env.ADMIN_API_KEY, {
      clientId: 'admin_client',
      name: 'Administrator',
      email: 'admin@dracin-api.com',
      rateLimit: 10000,
      allowedEndpoints: ['*'],
      isActive: true,
      expiresAt: new Date('2027-12-31'),
      role: 'admin'
    });
  }

  if (process.env.DEMO_API_KEY) {
    clients.set(process.env.DEMO_API_KEY, {
      clientId: 'demo_client',
      name: 'Demo Client',
      email: 'demo@example.com',
      rateLimit: 100,
      allowedEndpoints: ['*'],
      isActive: true,
      expiresAt: new Date('2026-12-31')
    });
  }

  if (process.env.PREMIUM_API_KEY) {
    clients.set(process.env.PREMIUM_API_KEY, {
      clientId: 'premium_client',
      name: 'Premium Client',
      email: 'premium@example.com',
      rateLimit: 1000,
      allowedEndpoints: ['*'],
      isActive: true,
      expiresAt: new Date('2026-12-31')
    });
  }

  return clients;
};

const fallbackClients = buildFallbackClients();

// Get client by API key (from Supabase or fallback)
const getClientByApiKey = async (apiKey) => {
  // Try Supabase first
  if (supabaseService.isReady()) {
    try {
      const client = await supabaseService.findClientByApiKey(apiKey);
      if (client) {
        return {
          clientId: client.client_id,
          name: client.name,
          email: client.email,
          rateLimit: client.rate_limit,
          allowedEndpoints: client.allowed_endpoints,
          isActive: client.is_active,
          expiresAt: client.expires_at,
          role: client.role
        };
      }
    } catch (error) {
      logger.warn('Supabase client lookup failed, using fallback:', error.message);
    }
  }
  
  // Fallback to in-memory
  return fallbackClients.get(apiKey);
};

/**
 * Legacy API Key Authentication Middleware (for admin routes)
 */
export const apiKeyAuth = async (req, res, next) => {
  // Skip authentication in development if no API key is set
  if (isDevelopment && !config.api.key) {
    return next();
  }

  // Skip if API key is not configured at all
  if (!config.api.key) {
    return next();
  }

  const providedKey = req.headers['x-api-key'] || req.query.api_key;

  if (!providedKey) {
    logger.warn('Missing API key', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.id
    });

    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'API key is required',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }

  // Get client from database
  const client = await getClientByApiKey(providedKey);
  
  if (!client || client.role !== 'admin') {
    logger.warn('Invalid or non-admin API key provided', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.id
    });

    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Admin API key required',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }

  // Add admin info to request
  req.tenant = client;

  logger.info('Admin API key authentication successful', {
    clientId: client.clientId,
    clientName: client.name,
    requestId: req.id
  });

  next();
};

/**
 * Multi-Tenant API Key Authentication Middleware
 */
export const tenantApiKeyAuth = async (req, res, next) => {
  // Skip authentication in development if no API key is set
  if (isDevelopment && !config.api.key) {
    req.tenant = { clientId: 'dev_client', name: 'Development Client' };
    return next();
  }

  // Skip if API key is not configured at all
  if (!config.api.key) {
    req.tenant = { clientId: 'default_client', name: 'Default Client' };
    return next();
  }

  const providedKey = req.headers['x-api-key'] || req.query.api_key;

  if (!providedKey) {
    logger.warn('Missing API key', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.id
    });

    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'API key is required. Contact admin to get your API key.',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }

  // Check cache first
  const cacheKey = `client_${providedKey}`;
  let client = cache.get(cacheKey);

  if (!client) {
    // Get from database
    client = await getClientByApiKey(providedKey);
    
    if (client) {
      // Cache for 5 minutes
      cache.set(cacheKey, client);
    }
  }

  if (!client) {
    logger.warn('Invalid API key provided', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.id
    });

    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid API key. Please check your API key or contact support.',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }

  // Check if client is active
  if (!client.isActive) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Your API key has been deactivated. Please contact support.',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }

  // Check if client has expired
  if (client.expiresAt && new Date() > client.expiresAt) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden', 
      message: 'Your API key has expired. Please renew your subscription.',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }

  // Check endpoint access
  const endpoint = req.route?.path || req.path;
  if (client.allowedEndpoints && !client.allowedEndpoints.includes('*') && !client.allowedEndpoints.includes(endpoint)) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'You do not have access to this endpoint.',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }

  // Add tenant info to request
  req.tenant = client;

  logger.info('API key authentication successful', {
    clientId: client.clientId,
    clientName: client.name,
    requestId: req.id
  });

  next();
};

/**
 * Rate Limiting per Tenant
 */
export const tenantRateLimit = (req, res, next) => {
  if (!req.tenant) return next();

  const clientId = req.tenant.clientId;
  const key = `rate_limit_${clientId}`;
  const limit = req.tenant.rateLimit || 100;
  const windowMs = 15 * 60 * 1000; // 15 minutes

  // Get current count from cache
  const current = cache.get(key) || { count: 0, resetTime: Date.now() + windowMs };

  // Reset if window expired
  if (Date.now() > current.resetTime) {
    current.count = 0;
    current.resetTime = Date.now() + windowMs;
  }

  // Check limit
  if (current.count >= limit) {
    return res.status(429).json({
      success: false,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Maximum ${limit} requests per 15 minutes.`,
      retryAfter: Math.ceil((current.resetTime - Date.now()) / 1000),
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }

  // Increment count
  current.count++;
  cache.set(key, current);

  // Add rate limit headers
  res.set({
    'X-RateLimit-Limit': limit,
    'X-RateLimit-Remaining': Math.max(0, limit - current.count),
    'X-RateLimit-Reset': new Date(current.resetTime).toISOString()
  });

  next();
};

/**
 * Request Timeout Middleware
 */
export const requestTimeout = (req, res, next) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      logger.warn('Request timeout', {
        url: req.url,
        method: req.method,
        timeout: config.timeout.request,
        requestId: req.id
      });

      res.status(408).json({
        success: false,
        error: 'Request Timeout',
        message: 'Request took too long to process',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
  }, config.timeout.request);

  // Clear timeout when response is sent
  res.on('finish', () => clearTimeout(timeout));
  res.on('close', () => clearTimeout(timeout));

  next();
};
