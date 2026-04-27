require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ai_bulk_reviews table
CREATE TABLE IF NOT EXISTS ai_bulk_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id TEXT NOT NULL UNIQUE,
    title TEXT,
    score FLOAT DEFAULT 0,
    feedback TEXT,
    status TEXT DEFAULT 'pending',
    last_run_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Index
CREATE INDEX IF NOT EXISTS idx_ai_bulk_reviews_doc_id ON ai_bulk_reviews(document_id);
`;

async function run() {
  console.log('Attempting to create ai_bulk_reviews table via execute_sql_hack...');
  const { data, error } = await supabase.rpc('execute_sql_hack', { sql: SQL });
  
  if (error) {
    console.error('Failed to create table. Error:', error);
  } else {
    console.log('ai_bulk_reviews table created successfully (or already exists).');
  }
}

run();
