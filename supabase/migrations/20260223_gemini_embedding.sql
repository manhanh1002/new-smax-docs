-- Migration: Update vector dimension for Google Gemini embeddings
-- Gemini embedding-001 has 3072 dimensions

-- Drop the existing index first
DROP INDEX IF EXISTS document_sections_embedding_idx;

-- Alter the embedding column to use 3072 dimensions (Gemini's dimension)
-- Note: This will fail if there's existing data, need to truncate first
-- If you have existing data, run: TRUNCATE document_sections CASCADE;
ALTER TABLE document_sections 
ALTER COLUMN embedding TYPE vector(3072);

-- Recreate the index for the new dimension
CREATE INDEX ON document_sections USING hnsw (embedding vector_cosine_ops);

-- Update the match_documents function for 3072 dimension
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
