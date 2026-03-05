import logger from '../utils/logger.js';
import { createSuccessResponse, createErrorResponse } from '../utils/responseHelper.js';
import { cache } from '../utils/cache.js';
import crypto from 'crypto';
import supabaseService from '../database/supabase.js';

// Fallback in-memory storage
const fallbackClients = new Map();

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
    const updates = req.body;

    // Find client by clientId
    const clientEntry = Array.from(apiClients.entries()).find(([key, client]) => 
      client.clientId === clientId
    );

    if (!clientEntry) {
      return res.status(404).json(createErrorResponse('Client not found'));
    }

    const [apiKey, client] = clientEntry;

    // Update client
    const updatedClient = { ...client, ...updates };
    apiClients.set(apiKey, updatedClient);

    // Clear cache
    cache.clear();

    logger.info('API client updated', {
      clientId,
      requestId: req.id
    });

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

    // Find and delete client
    let deleted = false;
    for (const [apiKey, client] of apiClients.entries()) {
      if (client.clientId === clientId) {
        apiClients.delete(apiKey);
        deleted = true;
        break;
      }
    }

    if (!deleted) {
      return res.status(404).json(createErrorResponse('Client not found'));
    }

    // Clear cache
    cache.clear();

    logger.info('API client deleted', {
      clientId,
      requestId: req.id
    });

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

    // Find client
    const clientEntry = Array.from(apiClients.entries()).find(([key, client]) => 
      client.clientId === clientId
    );

    if (!clientEntry) {
      return res.status(404).json(createErrorResponse('Client not found'));
    }

    const [oldApiKey, client] = clientEntry;

    // Generate new API key
    const newApiKey = generateApiKey();

    // Update with new key
    apiClients.delete(oldApiKey);
    apiClients.set(newApiKey, client);

    // Clear cache
    cache.clear();

    logger.info('API key regenerated', {
      clientId,
      requestId: req.id
    });

    res.json(createSuccessResponse({
      clientId: client.clientId,
      apiKey: newApiKey, // Only show once
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

    // Find client
    const client = Array.from(apiClients.values()).find(c => c.clientId === clientId);

    if (!client) {
      return res.status(404).json(createErrorResponse('Client not found'));
    }

    const stats = {
      clientId: client.clientId,
      name: client.name,
      totalRequests: client.totalRequests,
      lastUsed: client.lastUsed,
      rateLimit: client.rateLimit,
      isActive: client.isActive,
      expiresAt: client.expiresAt,
      createdAt: client.createdAt
    };

    res.json(createSuccessResponse(stats, 'Client statistics retrieved successfully'));
  } catch (error) {
    next(error);
  }
};
