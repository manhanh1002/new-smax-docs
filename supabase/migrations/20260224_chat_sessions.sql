-- Chat sessions table for SDK widget
-- Stores chat history per unique user

CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  user_fingerprint text,
  messages jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS chat_sessions_user_id_idx ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS chat_sessions_updated_at_idx ON chat_sessions(updated_at DESC);

-- Enable RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read/write (for SDK widget)
CREATE POLICY "Allow public access to chat_sessions"
  ON chat_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to upsert chat session
CREATE OR REPLACE FUNCTION upsert_chat_session(
  p_user_id text,
  p_messages jsonb,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  INSERT INTO chat_sessions (user_id, messages, metadata, updated_at)
  VALUES (p_user_id, p_messages, p_metadata, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    messages = p_messages,
    metadata = COALESCE(p_metadata, chat_sessions.metadata),
    updated_at = now()
  RETURNING id INTO v_session_id;
  
  RETURN v_session_id;
END;
$$;

-- Function to get chat session
CREATE OR REPLACE FUNCTION get_chat_session(p_user_id text)
RETURNS TABLE (
  id uuid,
  user_id text,
  messages jsonb,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id,
    cs.user_id,
    cs.messages,
    cs.metadata,
    cs.created_at,
    cs.updated_at
  FROM chat_sessions cs
  WHERE cs.user_id = p_user_id;
END;
$$;