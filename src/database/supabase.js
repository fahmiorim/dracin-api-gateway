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

  async addAuditLog({ action, targetId, adminId = 'admin', details = {} }) {
    try {
      const { error } = await this.supabase
        .from('api_audit_logs')
        .insert([{ action, target_id: targetId, admin_id: adminId, details }]);
      if (error) throw error;
    } catch (error) {
      logger.error('Error writing audit log:', error.message);
    }
  }

  async getAuditLogs({ limit = 100, days = 30 } = {}) {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await this.supabase
        .from('api_audit_logs')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching audit logs:', error.message);
      return [];
    }
  }

  async getLogs({ limit = 100, clientId, endpoint, statusCode, days = 7 } = {}) {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      let query = this.supabase
        .from('api_usage_logs')
        .select('id, client_id, endpoint, method, status_code, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (clientId) query = query.eq('client_id', clientId);
      if (endpoint) query = query.ilike('endpoint', `%${endpoint}%`);
      if (statusCode) query = query.eq('status_code', statusCode);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching logs:', error.message);
      return [];
    }
  }

  async getAnalytics(days = 7) {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await this.supabase
        .from('api_usage_logs')
        .select('created_at, status_code, endpoint')
        .gte('created_at', since)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const logs = data || [];

      // Aggregate by date
      const byDate = {};
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        byDate[key] = { date: key, total: 0, success: 0, error: 0 };
      }

      for (const log of logs) {
        const key = log.created_at.split('T')[0];
        if (byDate[key]) {
          byDate[key].total++;
          if (log.status_code < 400) byDate[key].success++;
          else byDate[key].error++;
        }
      }

      // Top endpoints
      const endpointCount = {};
      for (const log of logs) {
        endpointCount[log.endpoint] = (endpointCount[log.endpoint] || 0) + 1;
      }
      const topEndpoints = Object.entries(endpointCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([endpoint, count]) => ({ endpoint, count }));

      return {
        daily: Object.values(byDate),
        topEndpoints,
        total: logs.length,
        successRate: logs.length > 0
          ? Math.round((logs.filter(l => l.status_code < 400).length / logs.length) * 100)
          : 100
      };
    } catch (error) {
      logger.error('Error fetching analytics:', error.message);
      return { daily: [], topEndpoints: [], total: 0, successRate: 100 };
    }
  }

  // ─── Contents Methods ───────────────────────────────────────────────────────

  async deleteAllContents(platform = null) {
    try {
      let q = this.supabase.from('contents').delete();
      if (platform) {
        q = q.eq('platform', platform);
      } else {
        q = q.neq('id', '00000000-0000-0000-0000-000000000000'); // delete all rows
      }
      const { error, count } = await q.select('id');
      if (error) throw error;
      return count || 0;
    } catch (error) {
      logger.error('Error deleting contents:', error.message);
      return 0;
    }
  }

  async upsertContents(items) {
    if (!items || items.length === 0) return 0;
    try {
      const rows = items.map(item => ({
        platform: item.platform,
        external_id: item.external_id,
        title: item.title,
        description: item.description,
        cover_url: item.cover_url,
        episode_count: item.episode_count || 0,
        genres: item.genres || [],
        metadata: item.metadata || {},
        last_synced_at: new Date().toISOString()
      }));

      const { error } = await this.supabase
        .from('contents')
        .upsert(rows, { onConflict: 'platform,external_id' });

      if (error) throw error;
      return rows.length;
    } catch (error) {
      logger.error('Error upserting contents:', error.message);
      return 0;
    }
  }

  async getContentById(id) {
    try {
      const { data, error } = await this.supabase
        .from('contents')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data;
    } catch (error) {
      logger.error('Error getting content by id:', error.message);
      return null;
    }
  }

  async searchContents({ query, platform, limit = 20, offset = 0 }) {
    try {
      let q = this.supabase
        .from('contents')
        .select('*', { count: 'exact' });

      if (platform) q = q.eq('platform', platform);
      if (query)    q = q.ilike('title', `%${query}%`);

      q = q.order('last_synced_at', { ascending: false })
           .range(offset, offset + limit - 1);

      const { data, error, count } = await q;
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    } catch (error) {
      logger.error('Error searching contents:', error.message);
      return { data: [], count: 0 };
    }
  }

  async getContentsStats() {
    try {
      const { data, error } = await this.supabase
        .from('contents')
        .select('platform')
        .order('platform');

      if (error) throw error;

      const stats = {};
      for (const row of data || []) {
        stats[row.platform] = (stats[row.platform] || 0) + 1;
      }
      return stats;
    } catch (error) {
      logger.error('Error getting contents stats:', error.message);
      return {};
    }
  }

  async getLastSyncTime(platform) {
    try {
      const q = this.supabase
        .from('contents')
        .select('last_synced_at')
        .order('last_synced_at', { ascending: false })
        .limit(1);

      if (platform) q.eq('platform', platform);

      const { data, error } = await q;
      if (error) throw error;
      return data?.[0]?.last_synced_at || null;
    } catch (error) {
      return null;
    }
  }

  // ─── Sync Log Methods ────────────────────────────────────────────────────────

  async startSyncLog(platform) {
    try {
      const { data, error } = await this.supabase
        .from('sync_logs')
        .insert({ platform, status: 'running', started_at: new Date().toISOString() })
        .select('id')
        .single();
      if (error) throw error;
      return data?.id || null;
    } catch (error) {
      logger.warn('Error starting sync log:', error.message);
      return null;
    }
  }

  async finishSyncLog(logId, status, itemsSynced, errorMessage = null) {
    if (!logId) return;
    try {
      await this.supabase
        .from('sync_logs')
        .update({
          status,
          items_synced: itemsSynced,
          error_message: errorMessage,
          finished_at: new Date().toISOString()
        })
        .eq('id', logId);
    } catch (error) {
      logger.warn('Error finishing sync log:', error.message);
    }
  }

  async getSyncLogs(limit = 20) {
    try {
      const { data, error } = await this.supabase
        .from('sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting sync logs:', error.message);
      return [];
    }
  }

  isReady() {
    return this.isConnected;
  }
}

// Create singleton instance
const supabaseService = new SupabaseService();

export default supabaseService;
