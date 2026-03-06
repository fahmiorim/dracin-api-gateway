-- Create api_audit_logs table for admin action tracking
CREATE TABLE IF NOT EXISTS api_audit_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action      TEXT NOT NULL,
  target_id   TEXT,
  admin_id    TEXT DEFAULT 'admin',
  details     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries by date
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON api_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON api_audit_logs(action);

-- RLS: disable for now (service role handles access)
ALTER TABLE api_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_audit_logs" ON api_audit_logs
  USING (true) WITH CHECK (true);
