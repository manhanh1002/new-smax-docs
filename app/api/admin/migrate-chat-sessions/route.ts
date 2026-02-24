// app/api/admin/migrate-chat-sessions/route.ts
// Run migration to create chat_sessions table

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const MIGRATION_SQL = `
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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_sessions' AND policyname = 'Allow public access to chat_sessions'
  ) THEN
    CREATE POLICY "Allow public access to chat_sessions"
      ON chat_sessions FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

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
`

export async function POST(request: NextRequest) {
  try {
    // Check authorization (simple check)
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    
    if (authHeader !== expectedAuth) {
      // Also allow if running in dev mode
      const isDev = process.env.NODE_ENV === 'development'
      if (!isDev) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Run migration using raw SQL
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql: MIGRATION_SQL })
    
    // If exec_sql doesn't exist, try direct approach
    if (error && error.message.includes('exec_sql')) {
      // Split SQL and run each statement
      const statements = MIGRATION_SQL.split(';').filter(s => s.trim())
      const results = []
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            // Use raw query via Supabase
            const { error: stmtError } = await supabaseAdmin
              .from('_migrations')
              .select('id')
              .limit(1)
            
            // This will fail but that's ok - we're just testing connection
            results.push({ statement: statement.substring(0, 50) + '...', status: 'attempted' })
          } catch (e) {
            results.push({ statement: statement.substring(0, 50) + '...', status: 'attempted' })
          }
        }
      }
      
      return NextResponse.json({
        message: 'Migration SQL prepared. Please run manually in Supabase dashboard.',
        sql: MIGRATION_SQL,
        note: 'The exec_sql function is not available. Copy the SQL and run it in Supabase SQL Editor.'
      })
    }

    if (error) {
      console.error('Migration error:', error)
      return NextResponse.json({ 
        error: error.message,
        sql: MIGRATION_SQL 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      table: 'chat_sessions'
    })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      sql: MIGRATION_SQL
    }, { status: 500 })
  }
}

export async function GET() {
  // Return the SQL for manual execution
  return NextResponse.json({
    message: 'Use POST to run migration, or copy SQL below to run manually',
    sql: MIGRATION_SQL,
    instructions: [
      '1. Go to Supabase Dashboard',
      '2. Navigate to SQL Editor',
      '3. Paste the SQL and run'
    ]
  })
}