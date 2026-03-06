import logger from '../utils/logger.js';
import { createSuccessResponse, createErrorResponse } from '../utils/responseHelper.js';
import { cache } from '../utils/cache.js';
import crypto from 'crypto';
import supabaseService from '../database/supabase.js';

// Fallback in-memory storage
const fallbackClients = new Map();

/**
 * Admin Login - validate admin API key
 */
export const adminLogin = async (req, res, next) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json(createErrorResponse('API key is required'));
    }

    const adminKey = process.env.ADMIN_API_KEY;
    if (!adminKey || apiKey !== adminKey) {
      return res.status(401).json(createErrorResponse('Invalid admin API key'));
    }

    logger.info('Admin login successful', { requestId: req.id });

    res.json(createSuccessResponse({ apiKey, role: 'admin' }, 'Login successful'));
  } catch (error) {
    next(error);
  }
};

/**
 * Get overall admin dashboard stats
 */
export const getAdminStats = async (req, res, next) => {
  try {
    if (supabaseService.isReady()) {
      try {
        const clients = await supabaseService.listClients();
        const now = new Date();

        const total = clients.length;
        const active = clients.filter(c => c.is_active && (!c.expires_at || new Date(c.expires_at) > now)).length;
        const expired = clients.filter(c => c.expires_at && new Date(c.expires_at) <= now).length;
        const inactive = clients.filter(c => !c.is_active).length;
        const totalRequests = clients.reduce((sum, c) => sum + (c.total_requests || 0), 0);
        const recentClients = [...clients]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5)
          .map(c => ({
            clientId: c.client_id,
            name: c.name,
            email: c.email,
            isActive: c.is_active,
            totalRequests: c.total_requests || 0,
            createdAt: c.created_at
          }));

        return res.json(createSuccessResponse({
          total,
          active,
          expired,
          inactive,
          totalRequests,
          recentClients
        }, 'Stats retrieved successfully'));
      } catch (supabaseError) {
        logger.warn('Supabase stats failed, using fallback:', supabaseError.message);
      }
    }

    // Fallback to in-memory
    const now = new Date();
    const clients = Array.from(fallbackClients.values());
    const total = clients.length;
    const active = clients.filter(c => c.isActive && (!c.expiresAt || new Date(c.expiresAt) > now)).length;
    const expired = clients.filter(c => c.expiresAt && new Date(c.expiresAt) <= now).length;
    const totalRequests = clients.reduce((sum, c) => sum + (c.totalRequests || 0), 0);

    res.json(createSuccessResponse({
      total,
      active,
      expired,
      inactive: total - active - expired,
      totalRequests,
      recentClients: clients.slice(-5).reverse()
    }, 'Stats retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Generate API Key
 */
const generateApiKey = () => {
  return 'dk_' + crypto.randomBytes(32).toString('hex');
};

/**
 * Create new API client
 */
export const createApiClient = async (req, res, next) => {
  try {
    const { name, email, rateLimit = 100, allowedEndpoints = ['*'], expiresAt } = req.body;

    // Validate input
    if (!name || !email) {
      return res.status(400).json(createErrorResponse(
        'Name and email are required'
      ));
    }

    // Generate API key and client ID
    const apiKey = generateApiKey();
    const clientId = `client_${Date.now()}`;

    const newClient = {
      clientId,
      name,
      email,
      rateLimit,
      allowedEndpoints,
      isActive: true,
      expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year default
      createdAt: new Date(),
      lastUsed: null,
      totalRequests: 0
    };

    // Try Supabase first, fallback to memory
    try {
      if (supabaseService.isReady()) {
        const supabaseClient = {
          client_id: clientId,
          api_key: apiKey,
          name,
          email,
          rate_limit: rateLimit,
          allowed_endpoints: allowedEndpoints,
          is_active: true,
          expires_at: newClient.expiresAt,
          role: 'client'
        };
        
        const savedClient = await supabaseService.createClient(supabaseClient);
        
        logger.info('New API client created in Supabase', {
          clientId: savedClient.client_id,
          name: savedClient.name,
          requestId: req.id
        });

        res.status(201).json(createSuccessResponse({
          clientId: savedClient.client_id,
          name: savedClient.name,
          email: savedClient.email,
          apiKey: savedClient.api_key,
          rateLimit: savedClient.rate_limit,
          allowedEndpoints: savedClient.allowed_endpoints,
          expiresAt: savedClient.expires_at,
          createdAt: savedClient.created_at
        }, 'API client created successfully'));
        return;
      }
    } catch (supabaseError) {
      logger.warn('Supabase failed, using fallback:', supabaseError.message);
    }

    // Fallback to in-memory
    fallbackClients.set(apiKey, newClient);

    // Clear cache
    cache.clear();

    logger.info('New API client created (fallback)', {
      clientId: newClient.clientId,
      name: newClient.name,
      requestId: req.id
    });

    res.status(201).json(createSuccessResponse({
      clientId: newClient.clientId,
      name: newClient.name,
      email: newClient.email,
      apiKey: apiKey, // Only show once during creation
      rateLimit: newClient.rateLimit,
      allowedEndpoints: newClient.allowedEndpoints,
      expiresAt: newClient.expiresAt,
      createdAt: newClient.createdAt
    }, 'API client created successfully'));

  } catch (error) {
    next(error);
  }
};

/**
 * List all API clients (admin only)
 */
export const listApiClients = async (req, res, next) => {
  try {
    let clients = [];
    
    // Try Supabase first
    if (supabaseService.isReady()) {
      try {
        clients = await supabaseService.listClients();
        
        // Mask API keys
        const maskedClients = clients.map(client => ({
          clientId: client.client_id,
          name: client.name,
          email: client.email,
          apiKey: client.api_key.substring(0, 8) + '...', // Mask API key
          rateLimit: client.rate_limit,
          allowedEndpoints: client.allowed_endpoints,
          isActive: client.is_active,
          expiresAt: client.expires_at,
          createdAt: client.created_at,
          lastUsed: client.last_used,
          totalRequests: client.total_requests
        }));

        res.json(createSuccessResponse(maskedClients, 'API clients retrieved successfully'));
        return;
      } catch (supabaseError) {
        logger.warn('Supabase list failed, using fallback:', supabaseError.message);
      }
    }

    // Fallback to in-memory
    const maskedClients = Array.from(fallbackClients.entries()).map(([apiKey, client]) => ({
      clientId: client.clientId,
      name: client.name,
      email: client.email,
      apiKey: apiKey.substring(0, 8) + '...', // Mask API key
      rateLimit: client.rateLimit,
      allowedEndpoints: client.allowedEndpoints,
      isActive: client.isActive,
      expiresAt: client.expiresAt,
      createdAt: client.createdAt,
      lastUsed: client.lastUsed,
      totalRequests: client.totalRequests
    }));

    res.json(createSuccessResponse(maskedClients, 'API clients retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Update API client
 */
export const updateApiClient = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { name, email, rateLimit, allowedEndpoints, isActive, expiresAt } = req.body;

    // Try Supabase first
    if (supabaseService.isReady()) {
      try {
        const supabaseUpdates = {};
        if (name !== undefined) supabaseUpdates.name = name;
        if (email !== undefined) supabaseUpdates.email = email;
        if (rateLimit !== undefined) supabaseUpdates.rate_limit = rateLimit;
        if (allowedEndpoints !== undefined) supabaseUpdates.allowed_endpoints = allowedEndpoints;
        if (isActive !== undefined) supabaseUpdates.is_active = isActive;
        if (expiresAt !== undefined) supabaseUpdates.expires_at = new Date(expiresAt);

        const updated = await supabaseService.updateClient(clientId, supabaseUpdates);

        cache.clear();
        logger.info('API client updated in Supabase', { clientId, requestId: req.id });

        return res.json(createSuccessResponse({
          clientId: updated.client_id,
          name: updated.name,
          email: updated.email,
          rateLimit: updated.rate_limit,
          allowedEndpoints: updated.allowed_endpoints,
          isActive: updated.is_active,
          expiresAt: updated.expires_at
        }, 'API client updated successfully'));
      } catch (supabaseError) {
        logger.warn('Supabase update failed, using fallback:', supabaseError.message);
      }
    }

    // Fallback to in-memory
    const clientEntry = Array.from(fallbackClients.entries()).find(([, client]) =>
      client.clientId === clientId
    );

    if (!clientEntry) {
      return res.status(404).json(createErrorResponse('Client not found'));
    }

    const [apiKey, client] = clientEntry;
    const updatedClient = { ...client, ...req.body };
    fallbackClients.set(apiKey, updatedClient);

    cache.clear();
    logger.info('API client updated (fallback)', { clientId, requestId: req.id });

    res.json(createSuccessResponse(updatedClient, 'API client updated successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Delete API client
 */
export const deleteApiClient = async (req, res, next) => {
  try {
    const { clientId } = req.params;

    // Try Supabase first
    if (supabaseService.isReady()) {
      try {
        await supabaseService.deleteClient(clientId);
        cache.clear();
        logger.info('API client deleted from Supabase', { clientId, requestId: req.id });
        return res.json(createSuccessResponse(null, 'API client deleted successfully'));
      } catch (supabaseError) {
        logger.warn('Supabase delete failed, using fallback:', supabaseError.message);
      }
    }

    // Fallback to in-memory
    let deleted = false;
    for (const [apiKey, client] of fallbackClients.entries()) {
      if (client.clientId === clientId) {
        fallbackClients.delete(apiKey);
        deleted = true;
        break;
      }
    }

    if (!deleted) {
      return res.status(404).json(createErrorResponse('Client not found'));
    }

    cache.clear();
    logger.info('API client deleted (fallback)', { clientId, requestId: req.id });

    res.json(createSuccessResponse(null, 'API client deleted successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Regenerate API key
 */
export const regenerateApiKey = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const newApiKey = generateApiKey();

    // Try Supabase first
    if (supabaseService.isReady()) {
      try {
        const updated = await supabaseService.updateClient(clientId, { api_key: newApiKey });
        cache.clear();
        logger.info('API key regenerated in Supabase', { clientId, requestId: req.id });
        return res.json(createSuccessResponse({
          clientId: updated.client_id,
          apiKey: newApiKey,
          message: 'Please save this new API key securely'
        }, 'API key regenerated successfully'));
      } catch (supabaseError) {
        logger.warn('Supabase regenerate failed, using fallback:', supabaseError.message);
      }
    }

    // Fallback to in-memory
    const clientEntry = Array.from(fallbackClients.entries()).find(([, client]) =>
      client.clientId === clientId
    );

    if (!clientEntry) {
      return res.status(404).json(createErrorResponse('Client not found'));
    }

    const [oldApiKey, client] = clientEntry;
    fallbackClients.delete(oldApiKey);
    fallbackClients.set(newApiKey, client);

    cache.clear();
    logger.info('API key regenerated (fallback)', { clientId, requestId: req.id });

    res.json(createSuccessResponse({
      clientId: client.clientId,
      apiKey: newApiKey,
      message: 'Please save this new API key securely'
    }, 'API key regenerated successfully'));

  } catch (error) {
    next(error);
  }
};

/**
 * Get client usage statistics
 */
export const getClientStats = async (req, res, next) => {
  try {
    const { clientId } = req.params;

    // Try Supabase first
    if (supabaseService.isReady()) {
      try {
        const data = await supabaseService.getClientStats(clientId);
        return res.json(createSuccessResponse({
          clientId: data.client_id,
          name: data.name,
          totalRequests: data.total_requests,
          lastUsed: data.last_used,
          rateLimit: data.rate_limit,
          isActive: data.is_active,
          expiresAt: data.expires_at,
          createdAt: data.created_at,
          recentUsage: data.recentUsage
        }, 'Client statistics retrieved successfully'));
      } catch (supabaseError) {
        logger.warn('Supabase stats failed, using fallback:', supabaseError.message);
      }
    }

    // Fallback to in-memory
    const client = Array.from(fallbackClients.values()).find(c => c.clientId === clientId);

    if (!client) {
      return res.status(404).json(createErrorResponse('Client not found'));
    }

    res.json(createSuccessResponse({
      clientId: client.clientId,
      name: client.name,
      totalRequests: client.totalRequests,
      lastUsed: client.lastUsed,
      rateLimit: client.rateLimit,
      isActive: client.isActive,
      expiresAt: client.expiresAt,
      createdAt: client.createdAt
    }, 'Client statistics retrieved successfully'));
  } catch (error) {
    next(error);
  }
};
