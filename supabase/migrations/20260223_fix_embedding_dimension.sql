-- Migration to update embedding dimension to 768 (Gemini text-embedding-004)
-- and update the match_documents function accordingly.

begin;

  -- Update document_sections table
  -- Note: If data exists with different dimensions, this will fail or truncate.
  -- Assuming we can reset or this is a fresh setup.
  alter table document_sections 
  alter column embedding type vector(768);

  -- Update match_documents function signature and body
  drop function if exists match_documents(vector(1536), float, int, text);
  drop function if exists match_documents(vector(3072), float, int, text);
  
  create or replace function match_documents (
    query_embedding vector(768),
    match_threshold float,
    match_count int,
    filter_lang text default null
  )
  returns table (
    id uuid,
    content text,
    similarity float,
    document_path text,
    document_title text
  )
  language plpgsql
  as $$
  begin
    return query
    select
      ds.id,
      ds.content,
      1 - (ds.embedding <=> query_embedding) as similarity,
      d.path as document_path,
      d.title as document_title
    from document_sections ds
    join documents d on ds.document_id = d.id
    where 1 - (ds.embedding <=> query_embedding) > match_threshold
    and (filter_lang is null or d.lang = filter_lang)
    order by ds.embedding <=> query_embedding
    limit match_count;
  end;
  $$;

commit;
