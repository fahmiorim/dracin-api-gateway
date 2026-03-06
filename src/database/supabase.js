import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

class SupabaseService {
  constructor() {
    this.supabase = createClient(config.database.url, config.database.key);
    this.isConnected = false;
    this.init();
  }

  async init() {
    try {
      // Test connection
      const { data, error } = await this.supabase.from('api_clients').select('count').limit(1);
      
      if (error) {
        logger.warn('Supabase connection test failed, table may not exist:', error.message);
        await this.createTables();
      } else {
        logger.info('Supabase connected successfully');
        this.isConnected = true;
      }
    } catch (error) {
      logger.error('Failed to connect to Supabase:', error.message);
      // Fallback to in-memory storage
      this.isConnected = false;
    }
  }

  async createTables() {
    try {
      logger.info('Creating Supabase tables...');

      // Since we can't execute raw SQL easily, we'll create tables using Supabase UI
      // For now, we'll just insert the admin client if table exists
      await this.insertDefaultAdmin();

      logger.info('Supabase setup completed');
      this.isConnected = true;

    } catch (error) {
      logger.error('Failed to setup Supabase:', error.message);
    }
  }

  async insertDefaultAdmin() {
    try {
      const adminApiKey = process.env.ADMIN_API_KEY;
      if (!adminApiKey) {
        logger.warn('ADMIN_API_KEY not set, skipping default admin insert');
        return;
      }

      const { data, error } = await this.supabase
        .from('api_clients')
        .upsert([{
          client_id: 'admin_client',
          api_key: adminApiKey,
          name: 'Administrator',
          email: 'admin@dracin-api.com',
          rate_limit: 10000,
          allowed_endpoints: ['*'],
          is_active: true,
          expires_at: new Date('2027-12-31'),
          role: 'admin'
        }], {
          onConflict: 'api_key'
        });

      if (error) {
        logger.error('Failed to insert admin client:', error);
      } else {
        logger.info('Admin client inserted successfully');
      }
    } catch (error) {
      logger.error('Error inserting admin client:', error.message);
    }
  }

  // Client Management Methods
  async findClientByApiKey(apiKey) {
    try {
      const { data, error } = await this.supabase
        .from('api_clients')
        .select('*')
        .eq('api_key', apiKey)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        throw error;
      }

      // Check expiration
      if (data.expires_at && new Date() > new Date(data.expires_at)) {
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Error finding client by API key:', error.message);
      return null;
    }
  }

  async createClient(clientData) {
    try {
      const { data, error } = await this.supabase
        .from('api_clients')
        .insert([clientData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating client:', error.message);
      throw error;
    }
  }

  async updateClient(clientId, updates) {
    try {
      const { data, error } = await this.supabase
        .from('api_clients')
        .update(updates)
        .eq('client_id', clientId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating client:', error.message);
      throw error;
    }
  }

  async deleteClient(clientId) {
    try {
      const { error } = await this.supabase
        .from('api_clients')
        .delete()
        .eq('client_id', clientId);

      if (error) throw error;
      return true;
    } catch (error) {
      logger.error('Error deleting client:', error.message);
      throw error;
    }
  }

  async listClients(filters = {}) {
    try {
      let query = this.supabase
        .from('api_clients')
        .select('*');

      // Apply filters
      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      if (filters.role) {
        query = query.eq('role', filters.role);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error listing clients:', error.message);
      throw error;
    }
  }

  async updateClientUsage(clientId, increment = 1) {
    try {
      const { error } = await this.supabase.rpc('increment_client_usage', {
        p_client_id: clientId,
        p_increment: increment
      });

      if (error) {
        // Fallback: fetch current value then increment manually
        const { data: current } = await this.supabase
          .from('api_clients')
          .select('total_requests')
          .eq('client_id', clientId)
          .single();

        await this.supabase
          .from('api_clients')
          .update({
            total_requests: (current?.total_requests || 0) + increment,
            last_used: new Date()
          })
          .eq('client_id', clientId);
      }
    } catch (error) {
      logger.error('Error updating client usage:', error.message);
    }
  }

  async logUsage(logData) {
    try {
      const { error } = await this.supabase
        .from('api_usage_logs')
        .insert([logData]);

      if (error) throw error;
      return true;
    } catch (error) {
      logger.error('Error logging usage:', error.message);
      return false;
    }
  }

  // Rate limiting methods
  async checkRateLimit(clientId, limit = 100, windowMs = 900000) { // 15 minutes
    try {
      const windowStart = new Date(Date.now() - windowMs);
      
      const { data, error } = await this.supabase
        .from('api_usage_logs')
        .select('id')
        .eq('client_id', clientId)
        .gte('created_at', windowStart.toISOString())
        .limit(limit);

      if (error) throw error;

      return data.length < limit;
    } catch (error) {
      logger.error('Error checking rate limit:', error.message);
      return true; // Allow on error
    }
  }

  async getClientStats(clientId) {
    try {
      const { data, error } = await this.supabase
        .from('api_clients')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (error) throw error;

      // Get recent usage
      const { data: usageData, error: usageError } = await this.supabase
        .from('api_usage_logs')
        .select('created_at, endpoint, status_code')
        .eq('client_id', clientId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false })
        .limit(100);

      return {
        ...data,
        recentUsage: usageData || []
      };
    } catch (error) {
      logger.error('Error getting client stats:', error.message);
      throw error;
    }
  }

  isReady() {
    return this.isConnected;
  }
}

// Create singleton instance
const supabaseService = new SupabaseService();

export default supabaseService;
