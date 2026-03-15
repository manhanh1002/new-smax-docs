-- Fix: Correct column name in match_documents function
-- The documents table uses 'language' column, not 'lang'

begin;

  -- Drop existing function with wrong signature
  drop function if exists match_documents(vector(768), float, int, text);

  -- Recreate with correct column name (d.language instead of d.lang)
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
      and (filter_lang is null or d.language = filter_lang)  -- FIXED: d.language instead of d.lang
    order by ds.embedding <=> query_embedding
    limit match_count;
  end;
  $$;

commit;
