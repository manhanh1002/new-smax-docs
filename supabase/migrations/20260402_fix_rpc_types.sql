-- Fix Return types for match_documents_hybrid and match_documents_keyword
-- Cast results to float8 (double precision) to match search service expectations

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
  similarity float8,
  document_path text,
  document_title text,
  vector_score float8,
  text_score float8,
  trigram_score float8
)
language plpgsql
as $$
begin
  return query
  with vector_results as (
    select
      ds.id,
      ds.content,
      (1 - (ds.embedding <=> query_embedding))::float8 as vector_sim,
      d.path as document_path,
      d.title as document_title
    from document_sections ds
    join documents d on ds.document_id = d.id
    where 1 - (ds.embedding <=> query_embedding) > match_threshold * 0.5
      and (filter_lang is null or d.lang = filter_lang)
  ),
  text_results as (
    select
      ds.id,
      ts_rank_cd(ds.tsv_content, plainto_tsquery('english', coalesce(query_text, '')))::float8 as text_sim
    from document_sections ds
    join documents d on ds.document_id = d.id
    where ds.tsv_content @@ plainto_tsquery('english', coalesce(query_text, ''))
      and (filter_lang is null or d.lang = filter_lang)
  ),
  trigram_results as (
    select
      ds.id,
      similarity(ds.content, query_text)::float8 as trigram_sim
    from document_sections ds
    join documents d on ds.document_id = d.id
    where similarity(ds.content, query_text) > 0.1
      and length(query_text) > 2
      and (filter_lang is null or d.lang = filter_lang)
  )
  select
    vr.id,
    vr.content,
    (coalesce(vr.vector_sim, 0) * vector_weight +
    coalesce(tr.text_sim, 0) * text_weight +
    coalesce(tgr.trigram_sim, 0) * trigram_weight)::float8 as similarity,
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
  text_score float8,
  trigram_score float8
)
language plpgsql
as $$
begin
  return query
  with text_results as (
    select
      ds.id,
      ds.content,
      ts_rank_cd(ds.tsv_content, plainto_tsquery('english', query_text))::float8 as text_sim,
      d.path as document_path,
      d.title as document_title
    from document_sections ds
    join documents d on ds.document_id = d.id
    where ds.tsv_content @@ plainto_tsquery('english', query_text)
      and (filter_lang is null or d.lang = filter_lang)
    order by text_sim desc
    limit match_count
  ),
  trigram_results as (
    select
      ds.id,
      similarity(ds.content, query_text)::float8 as trigram_sim
    from document_sections ds
    join documents d on ds.document_id = d.id
    where similarity(ds.content, query_text) > 0.1
      and length(query_text) > 2
      and (filter_lang is null or d.lang = filter_lang)
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
