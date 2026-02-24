-- Migration: Fix vector dimension for Gemini embedding-001 (3072 dimensions)
-- Run this in Supabase SQL Editor

-- Step 1: Clear existing embeddings first (required before altering column type)
UPDATE documents SET embedding = NULL WHERE embedding IS NOT NULL;

-- Step 2: Drop existing index
DROP INDEX IF EXISTS documents_embedding_idx;

-- Step 3: Alter the embedding column to use 3072 dimensions
-- Using USING clause to handle the conversion
ALTER TABLE documents 
ALTER COLUMN embedding TYPE vector(3072) USING NULL;

-- Step 4: Recreate the index for the new dimension
CREATE INDEX documents_embedding_idx ON documents USING hnsw (embedding vector_cosine_ops);

-- Step 5: Create or replace search function for 3072 dimension
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

-- Step 6: Also update document_sections if it exists
-- First clear existing data
UPDATE document_sections SET embedding = NULL WHERE embedding IS NOT NULL;

-- Drop existing index
DROP INDEX IF EXISTS document_sections_embedding_idx;

-- Alter column
ALTER TABLE document_sections 
ALTER COLUMN embedding TYPE vector(3072) USING NULL;

-- Recreate index
CREATE INDEX ON document_sections USING hnsw (embedding vector_cosine_ops);

-- Update match_documents function for 3072 dimension
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(3072),
  match_threshold float,
  match_count int,
  filter_lang text default null
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  document_path text,
  document_title text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ds.id,
    ds.content,
    1 - (ds.embedding <=> query_embedding) as similarity,
    d.path as document_path,
    d.title as document_title
  FROM document_sections ds
  JOIN documents d ON ds.document_id = d.id
  WHERE 1 - (ds.embedding <=> query_embedding) > match_threshold
  AND (filter_lang IS NULL OR d.lang = filter_lang)
  ORDER BY ds.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;