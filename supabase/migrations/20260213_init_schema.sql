-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- 3.1. Create documents table
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  title text,
  slug text,
  lang varchar(2),
  path text,
  parent_id uuid,
  content text,
  meta jsonb default '{}'::jsonb,
  last_updated timestamptz,
  created_at timestamptz default now()
);

-- 3.2. Create document_sections table
create table if not exists document_sections (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  content text,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  token_count int
);

-- Create an index for faster vector similarity search (Optional but recommended)
-- using hnsw for better performance on recall
create index on document_sections using hnsw (embedding vector_cosine_ops);

-- 3.3. Create match_documents function
create or replace function match_documents (
  query_embedding vector(1536),
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

-- Enable Row Level Security (RLS)
alter table documents enable row level security;
alter table document_sections enable row level security;

-- Create policy to allow public read access (if needed for frontend)
create policy "Allow public read access on documents"
  on documents for select
  using (true);

create policy "Allow public read access on document_sections"
  on document_sections for select
  using (true);

-- Create policy to allow service role to do everything (implicit, but good to be explicit if needed)
-- Usually service role bypasses RLS, so we don't strictly need insert policies if we only write from backend.
