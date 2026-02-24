// app/api/admin/migrate/route.ts
// Admin endpoint to apply database migrations

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'fix-embedding-dimension') {
      // Fix embedding dimension to 3072 for Gemini
      const sql = `
        -- First, clear existing embeddings
        UPDATE documents SET embedding = NULL WHERE embedding IS NOT NULL;
        
        -- Drop existing index if exists
        DROP INDEX IF EXISTS documents_embedding_idx;
        
        -- Alter the embedding column to use 3072 dimensions
        ALTER TABLE documents 
        ALTER COLUMN embedding TYPE vector(3072);
        
        -- Recreate the index
        CREATE INDEX documents_embedding_idx ON documents USING hnsw (embedding vector_cosine_ops);
        
        -- Create or replace search function
        CREATE OR REPLACE FUNCTION search_documents (
          query_embedding vector(3072),
          match_threshold float,
          match_count int,
          filter_lang text default null
        )
        RETURNS TABLE (
          id uuid,
          title text,
          content text,
          similarity float,
          language text
        )
        LANGUAGE plpgsql
        AS $$
        BEGIN
          RETURN QUERY
          SELECT
            d.id,
            d.title,
            d.content,
            1 - (d.embedding <=> query_embedding) as similarity,
            d.language
          FROM documents d
          WHERE d.embedding IS NOT NULL
          AND 1 - (d.embedding <=> query_embedding) > match_threshold
          AND (filter_lang IS NULL OR d.language = filter_lang)
          ORDER BY d.embedding <=> query_embedding
          LIMIT match_count;
        END;
        $$;
      `

      // Execute via RPC
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql })
      
      if (error) {
        // Try alternative approach - just update the function
        const createFunctionSQL = `
          CREATE OR REPLACE FUNCTION search_documents (
            query_embedding vector(3072),
            match_threshold float,
            match_count int,
            filter_lang text default null
          )
          RETURNS TABLE (
            id uuid,
            title text,
            content text,
            similarity float,
            language text
          )
          LANGUAGE plpgsql
          AS $$
          BEGIN
            RETURN QUERY
            SELECT
              d.id,
              d.title,
              d.content,
              1 - (d.embedding <=> query_embedding) as similarity,
              d.language
            FROM documents d
            WHERE d.embedding IS NOT NULL
            AND 1 - (d.embedding <=> query_embedding) > match_threshold
            AND (filter_lang IS NULL OR d.language = filter_lang)
            ORDER BY d.embedding <=> query_embedding
            LIMIT match_count;
          END;
          $$;
        `
        
        return NextResponse.json({
          success: false,
          error: error.message,
          note: 'Please run the migration manually in Supabase SQL Editor',
          migrationFile: 'supabase/migrations/20260223_fix_embedding_dimension.sql'
        })
      }

      return NextResponse.json({ success: true, message: 'Migration applied successfully' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  // Check current table structure
  try {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('id, title, embedding')
      .limit(1)
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      })
    }

    // Check if embedding column exists and its dimension
    const hasEmbedding = data && data[0] && 'embedding' in data[0]
    
    return NextResponse.json({
      success: true,
      tableExists: true,
      embeddingColumnExists: hasEmbedding,
      sampleData: data,
      note: 'Use POST with action=fix-embedding-dimension to apply migration'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}