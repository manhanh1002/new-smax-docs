-- Hybrid Search Migration
-- Adds full-text search (tsvector) and trigram (pg_trgm) to enable hybrid search
-- Combines vector similarity + keyword matching for better retrieval

begin;

-- 1. Enable pg_trgm extension for trigram similarity search
create extension if not exists pg_trgm;

-- 2. Add tsvector column for full-text search on document_sections
alter table document_sections
add column if not exists tsv_content tsvector;

-- 3. Create function to generate tsvector from content
create or replace function document_sections_tsvector_trigger()
returns trigger as $$
begin
  new.tsv_content :=
    setweight(to_tsvector('english', coalesce(new.content, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.content, '')), 'B');
  return new;
end
$$ language plpgsql;

-- 4. Create trigger to auto-update tsvector
drop trigger if exists tsvector_update on document_sections;
create trigger tsvector_update
  before insert or update on document_sections
  for each row execute function document_sections_tsvector_trigger();

-- 5. Create GIN index on tsvector for fast full-text search
drop index if exists document_sections_tsvector_idx;
create index document_sections_tsvector_idx
on document_sections using gin (tsv_content);

-- 6. Create trigram index on content for fuzzy matching
drop index if exists document_sections_trgm_idx;
create index document_sections_trgm_idx
on document_sections using gin (content gin_trgm_ops);

-- 7. Create new hybrid match_documents function
-- Combines vector similarity + full-text search + trigram similarity
create or replace function match_documents_hybrid(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_lang text default null,
  query_text text default null,
  vector_weight float default 0.5,
  text_weight float default 0.3,
  trigram_weight float default 0.2
)
returns table (
  id uuid,
  content text,
  similarity float,
  document_path text,
  document_title text,
  vector_score float,
  text_score float,
  trigram_score float
)
language plpgsql
as $$
begin
  return query
  with vector_results as (
    select
      ds.id,
      ds.content,
      1 - (ds.embedding <=> query_embedding) as vector_sim,
      d.path as document_path,
      d.title as document_title
    from document_sections ds
    join documents d on ds.document_id = d.id
    where 1 - (ds.embedding <=> query_embedding) > match_threshold * 0.5
      and (filter_lang is null or d.language = filter_lang)
  ),
  text_results as (
    select
      ds.id,
      ts_rank_cd(ds.tsv_content, plainto_tsquery('english', coalesce(query_text, ''))) as text_sim
    from document_sections ds
    join documents d on ds.document_id = d.id
    where ds.tsv_content @@ plainto_tsquery('english', coalesce(query_text, ''))
      and (filter_lang is null or d.language = filter_lang)
  ),
  trigram_results as (
    select
      ds.id,
      similarity(ds.content, query_text) as trigram_sim
    from document_sections ds
    join documents d on ds.document_id = d.id
    where similarity(ds.content, query_text) > 0.1
      and length(query_text) > 2
      and (filter_lang is null or d.language = filter_lang)
  )
  select
    vr.id,
    vr.content,
    coalesce(vr.vector_sim, 0) * vector_weight +
    coalesce(tr.text_sim, 0) * text_weight +
    coalesce(tgr.trigram_sim, 0) * trigram_weight as similarity,
    vr.document_path,
    vr.document_title,
    vr.vector_sim as vector_score,
    tr.text_sim as text_score,
    tgr.trigram_sim as trigram_score
  from vector_results vr
  left join text_results tr on vr.id = tr.id
  left join trigram_results tgr on vr.id = tgr.id
  order by similarity desc
  limit match_count;
end;
$$;

-- 8. Also create simple keyword search function for text-only queries
create or replace function match_documents_keyword(
  query_text text,
  match_count int,
  filter_lang text default null
)
returns table (
  id uuid,
  content text,
  document_path text,
  document_title text,
  text_score float,
  trigram_score float
)
language plpgsql
as $$
begin
  return query
  with text_results as (
    select
      ds.id,
      ds.content,
      ts_rank_cd(ds.tsv_content, plainto_tsquery('english', query_text)) as text_sim,
      d.path as document_path,
      d.title as document_title
    from document_sections ds
    join documents d on ds.document_id = d.id
    where ds.tsv_content @@ plainto_tsquery('english', query_text)
      and (filter_lang is null or d.language = filter_lang)
    order by text_sim desc
    limit match_count
  ),
  trigram_results as (
    select
      ds.id,
      similarity(ds.content, query_text) as trigram_sim
    from document_sections ds
    join documents d on ds.document_id = d.id
    where similarity(ds.content, query_text) > 0.1
      and length(query_text) > 2
      and (filter_lang is null or d.language = filter_lang)
  )
  select
    tr.id,
    tr.content,
    tr.document_path,
    tr.document_title,
    tr.text_sim as text_score,
    tgr.trigram_sim as trigram_score
  from text_results tr
  left join trigram_results tgr on tr.id = tgr.id
  order by coalesce(tr.text_sim, 0) + coalesce(tgr.trigram_sim, 0) desc
  limit match_count;
end;
$$;

-- 9. Create function to update tsvector for existing data
create or replace function update_all_tsvector()
returns void as $$
begin
  update document_sections
  set tsv_content = setweight(to_tsvector('english', coalesce(content, '')), 'A') ||
                   setweight(to_tsvector('simple', coalesce(content, '')), 'B');
end;
$$ language plpgsql;

commit;
