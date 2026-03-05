-- =====================================================
-- Supabase Database Setup for Dracin API Gateway
-- =====================================================
-- Run this script in Supabase SQL Editor

-- 1. Create api_clients table
CREATE TABLE IF NOT EXISTS api_clients (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR(255) UNIQUE NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    rate_limit INTEGER DEFAULT 100,
    allowed_endpoints JSONB DEFAULT '["*"]',
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP,
    role VARCHAR(50) DEFAULT 'client',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP,
    total_requests INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'
);

-- 2. Create indexes for api_clients
CREATE INDEX IF NOT EXISTS idx_api_clients_api_key ON api_clients(api_key);
CREATE INDEX IF NOT EXISTS idx_api_clients_client_id ON api_clients(client_id);
CREATE INDEX IF NOT EXISTS idx_api_clients_email ON api_clients(email);
CREATE INDEX IF NOT EXISTS idx_api_clients_is_active ON api_clients(is_active);
CREATE INDEX IF NOT EXISTS idx_api_clients_expires_at ON api_clients(expires_at);

-- 3. Create api_usage_logs table
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR(255) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time INTEGER,
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create indexes for api_usage_logs
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_client_id ON api_usage_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON api_usage_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_status_code ON api_usage_logs(status_code);

-- 5. Create rate_limits table (optional, for advanced rate limiting)
CREATE TABLE IF NOT EXISTS rate_limits (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR(255) NOT NULL,
    window_start TIMESTAMP NOT NULL,
    request_count INTEGER DEFAULT 0,
    window_duration INTEGER DEFAULT 900, -- 15 minutes in seconds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, window_start)
);

-- 6. Create indexes for rate_limits
CREATE INDEX IF NOT EXISTS idx_rate_limits_client_window ON rate_limits(client_id, window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

-- 7. Create billing_plans table
CREATE TABLE IF NOT EXISTS billing_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    billing_cycle VARCHAR(50) NOT NULL, -- 'monthly', 'yearly'
    rate_limit INTEGER NOT NULL,
    features JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR(255) NOT NULL,
    plan_id INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'active', 'cancelled', 'expired', 'suspended'
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP,
    auto_renew BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES api_clients(client_id),
    FOREIGN KEY (plan_id) REFERENCES billing_plans(id)
);

-- 9. Create indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_client_id ON subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_ends_at ON subscriptions(ends_at);

-- 10. Insert default billing plans
INSERT INTO billing_plans (name, description, price, billing_cycle, rate_limit, features) VALUES
('Basic', 'Perfect for small projects', 10.00, 'monthly', 100, '{"support": "email", "endpoints": "all"}'),
('Premium', 'For growing businesses', 50.00, 'monthly', 1000, '{"support": "priority", "endpoints": "all", "custom": true}'),
('Enterprise', 'For large organizations', 200.00, 'monthly', 10000, '{"support": "24/7", "endpoints": "all", "custom": true, "sla": true}')
ON CONFLICT (name) DO NOTHING;

-- 11. Insert default admin client
INSERT INTO api_clients (client_id, api_key, name, email, rate_limit, allowed_endpoints, is_active, expires_at, role) VALUES
('admin_client', 'admin_key_2026', 'Administrator', 'admin@dracin-api.com', 10000, '["*"]', true, '2027-12-31', 'admin')
ON CONFLICT (api_key) DO NOTHING;

-- 12. Create Row Level Security (RLS) policies
-- Enable RLS on all tables
ALTER TABLE api_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 13. Create RLS policies
-- Only authenticated users can read their own data
CREATE POLICY "Users can view their own client data" ON api_clients
    FOR SELECT USING (auth.uid()::text = (SELECT api_key FROM api_clients WHERE api_key = current_setting('request.jwt.claims', true)::json->>'apiKey'));

-- Only service role can manage clients
CREATE POLICY "Service role can manage clients" ON api_clients
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Service role can manage all usage logs
CREATE POLICY "Service role can manage usage logs" ON api_usage_logs
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- 14. Create function for incrementing client usage
CREATE OR REPLACE FUNCTION increment_client_usage(p_client_id VARCHAR, p_increment INTEGER DEFAULT 1)
RETURNS VOID AS $$
BEGIN
    UPDATE api_clients 
    SET 
        total_requests = total_requests + p_increment,
        last_used = CURRENT_TIMESTAMP
    WHERE client_id = p_client_id;
END;
$$ LANGUAGE plpgsql;

-- 15. Create function for checking rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(p_client_id VARCHAR, p_limit INTEGER DEFAULT 100, p_window_minutes INTEGER DEFAULT 15)
RETURNS BOOLEAN AS $$
DECLARE
    request_count INTEGER;
    window_start TIMESTAMP := CURRENT_TIMESTAMP - (p_window_minutes || ' minutes')::INTERVAL;
BEGIN
    SELECT COUNT(*) INTO request_count
    FROM api_usage_logs
    WHERE client_id = p_client_id 
    AND created_at >= window_start;
    
    RETURN request_count < p_limit;
END;
$$ LANGUAGE plpgsql;

-- 16. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_billing_plans_updated_at BEFORE UPDATE ON billing_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Setup Complete!
-- =====================================================
-- Your Supabase database is now ready for the Dracin API Gateway
-- 
-- Next steps:
-- 1. Test the API endpoints
-- 2. Create your first client via the admin API
-- 3. Start using your multi-tenant API Gateway!
-- =====================================================
