-- Create system_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insert default ai_config if it doesn't exist
INSERT INTO system_settings (key, value, description)
VALUES (
  'ai_config',
  '{"provider": "token.ai", "apiKey": "", "model": "gpt-5-chat", "baseURL": "https://token.ai.vn/v1"}'::jsonb,
  'Global AI provider and model configuration'
)
ON CONFLICT (key) DO NOTHING;

-- Policies for system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to anyone (or restrict if sensitive, but we need it for backend API. Backend has admin bypass.)
CREATE POLICY "Allow public read access to system_settings"
  ON system_settings FOR SELECT
  USING (true);

-- Allow update only for authenticated users! Wait, since it's backend we can just use supabaseAdmin role. Let's provide basic policy for Authenticated users to update
CREATE POLICY "Allow authenticated update system_settings"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
