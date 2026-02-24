# AI-Powered Documentation Search Implementation Guide

This guide provides a comprehensive, step-by-step plan for adding AI-powered semantic search to your documentation site using Supabase, Upstash QStash Vector, Vercel AI SDK, and Vercel AI Gateway.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Phase 1: Supabase Setup](#phase-1-supabase-setup)
4. [Phase 2: Upstash Vector Setup](#phase-2-upstash-vector-setup)
5. [Phase 3: Content Ingestion Pipeline](#phase-3-content-ingestion-pipeline)
6. [Phase 4: Search API Implementation](#phase-4-search-api-implementation)
7. [Phase 5: AI Chat Integration](#phase-5-ai-chat-integration)
8. [Phase 6: UI Integration](#phase-6-ui-integration)
9. [Phase 7: Testing & Optimization](#phase-7-testing--optimization)
10. [Phase 8: Deployment](#phase-8-deployment)

---

## Architecture Overview

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Command Palette │  │  AI Assistant   │  │  Search Results │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
└───────────┼─────────────────────┼─────────────────────┼─────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js API Routes                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ /api/search     │  │ /api/chat       │  │ /api/ingest     │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
└───────────┼─────────────────────┼─────────────────────┼─────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI & Vector Layer                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Vercel AI SDK   │  │ Vercel AI       │  │ Upstash Vector  │ │
│  │ (Embeddings)    │  │ Gateway (LLM)   │  │ (Semantic Search│ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Data Layer                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      Supabase                                ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  ││
│  │  │ documents   │  │ doc_chunks  │  │ search_analytics    │  ││
│  │  │ (metadata)  │  │ (content)   │  │ (usage tracking)    │  ││
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
\`\`\`

### Data Flow

1. **Ingestion**: Documentation content → Chunked → Embedded → Stored in Upstash Vector + Supabase
2. **Search**: User query → Embedded → Vector similarity search → Ranked results
3. **AI Chat**: User question → Context retrieval (RAG) → LLM response via AI Gateway

---

## Prerequisites

### Required Accounts & Services

- [ ] Vercel account with project deployed
- [ ] Supabase account (free tier works for development)
- [ ] Upstash account (for QStash Vector)
- [ ] Access to Vercel AI Gateway (included with Vercel)

### Required Environment Variables

\`\`\`env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Upstash Vector
UPSTASH_VECTOR_REST_URL=your_vector_url
UPSTASH_VECTOR_REST_TOKEN=your_vector_token

# AI Gateway (automatic with Vercel, but can specify)
# No additional env vars needed - uses Vercel AI Gateway by default
\`\`\`

### Required Dependencies

\`\`\`bash
npm install @supabase/supabase-js @supabase/ssr @upstash/vector ai
\`\`\`

---

## Phase 1: Supabase Setup

### Task 1.1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Settings → API
3. Get your service role key for server-side operations

### Task 1.2: Create Database Schema

Create a new SQL migration file:

\`\`\`sql
-- scripts/001_create_ai_search_tables.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Documents table: stores metadata about each documentation page
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  checksum TEXT NOT NULL, -- MD5 hash to detect changes
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document chunks table: stores chunked content for embedding
CREATE TABLE IF NOT EXISTS doc_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(document_id, chunk_index)
);

-- Search analytics table: tracks search queries for improvement
CREATE TABLE IF NOT EXISTS search_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  clicked_result_id UUID REFERENCES documents(id),
  user_session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_slug ON documents(slug);
CREATE INDEX IF NOT EXISTS idx_documents_updated ON documents(updated_at);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_document ON doc_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created ON search_analytics(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for documents table
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
\`\`\`

### Task 1.3: Set Up Row Level Security (RLS)

\`\`\`sql
-- scripts/002_setup_rls.sql

-- Enable RLS on all tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

-- Documents: public read access
CREATE POLICY "Documents are publicly readable"
  ON documents FOR SELECT
  USING (true);

-- Documents: only service role can insert/update/delete
CREATE POLICY "Service role can manage documents"
  ON documents FOR ALL
  USING (auth.role() = 'service_role');

-- Doc chunks: public read access
CREATE POLICY "Doc chunks are publicly readable"
  ON doc_chunks FOR SELECT
  USING (true);

-- Doc chunks: only service role can manage
CREATE POLICY "Service role can manage doc chunks"
  ON doc_chunks FOR ALL
  USING (auth.role() = 'service_role');

-- Search analytics: public insert (anonymous tracking)
CREATE POLICY "Anyone can insert search analytics"
  ON search_analytics FOR INSERT
  WITH CHECK (true);

-- Search analytics: only service role can read
CREATE POLICY "Service role can read search analytics"
  ON search_analytics FOR SELECT
  USING (auth.role() = 'service_role');
\`\`\`

### Task 1.4: Create Supabase Client Utilities

\`\`\`typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore - called from Server Component
          }
        },
      },
    }
  )
}

// Admin client with service role for ingestion
export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  )
}
\`\`\`

\`\`\`typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (client) return client
  
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  return client
}
\`\`\`

---

## Phase 2: Upstash Vector Setup

### Task 2.1: Create Upstash Vector Index

1. Go to [console.upstash.com](https://console.upstash.com)
2. Navigate to Vector Database
3. Create a new index with these settings:
   - **Name**: `docs-embeddings`
   - **Region**: Choose closest to your users
   - **Dimensions**: `1536` (for OpenAI text-embedding-3-small)
   - **Similarity Metric**: `cosine`

### Task 2.2: Create Vector Client Utility

\`\`\`typescript
// lib/vector/client.ts
import { Index } from '@upstash/vector'

// Singleton pattern for vector client
let vectorClient: Index | null = null

export function getVectorClient(): Index {
  if (vectorClient) return vectorClient
  
  vectorClient = new Index({
    url: process.env.UPSTASH_VECTOR_REST_URL!,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
  })
  
  return vectorClient
}

// Types for vector operations
export interface VectorDocument {
  id: string
  vector: number[]
  metadata: {
    documentId: string
    chunkId: string
    slug: string
    title: string
    content: string
    chunkIndex: number
  }
}

export interface SearchResult {
  id: string
  score: number
  metadata: VectorDocument['metadata']
}
\`\`\`

### Task 2.3: Create Embedding Utility

\`\`\`typescript
// lib/ai/embeddings.ts
import { embed, embedMany } from 'ai'

const EMBEDDING_MODEL = 'openai/text-embedding-3-small'

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: text,
  })
  
  return embedding
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: EMBEDDING_MODEL,
    values: texts,
  })
  
  return embeddings
}

/**
 * Estimate token count for a text (rough approximation)
 */
export function estimateTokenCount(text: string): number {
  // Rough estimate: ~4 characters per token for English
  return Math.ceil(text.length / 4)
}
\`\`\`

---

## Phase 3: Content Ingestion Pipeline

### Task 3.1: Create Content Chunking Utility

\`\`\`typescript
// lib/ai/chunking.ts

export interface Chunk {
  content: string
  index: number
  tokenCount: number
  metadata: Record<string, unknown>
}

export interface ChunkingOptions {
  maxTokens?: number
  overlap?: number
  preserveParagraphs?: boolean
}

const DEFAULT_OPTIONS: Required<ChunkingOptions> = {
  maxTokens: 500,
  overlap: 50,
  preserveParagraphs: true,
}

/**
 * Split content into overlapping chunks for better semantic search
 */
export function chunkContent(
  content: string,
  options: ChunkingOptions = {}
): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const chunks: Chunk[] = []
  
  // Clean and normalize content
  const cleanContent = content
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  
  if (opts.preserveParagraphs) {
    // Split by paragraphs first
    const paragraphs = cleanContent.split(/\n\n+/)
    let currentChunk = ''
    let chunkIndex = 0
    
    for (const paragraph of paragraphs) {
      const paragraphTokens = estimateTokens(paragraph)
      const currentTokens = estimateTokens(currentChunk)
      
      if (currentTokens + paragraphTokens > opts.maxTokens && currentChunk) {
        // Save current chunk
        chunks.push({
          content: currentChunk.trim(),
          index: chunkIndex++,
          tokenCount: currentTokens,
          metadata: {},
        })
        
        // Start new chunk with overlap
        const overlapText = getOverlapText(currentChunk, opts.overlap)
        currentChunk = overlapText + '\n\n' + paragraph
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph
      }
    }
    
    // Don't forget the last chunk
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex,
        tokenCount: estimateTokens(currentChunk),
        metadata: {},
      })
    }
  } else {
    // Simple character-based chunking
    const maxChars = opts.maxTokens * 4 // Rough token-to-char ratio
    const overlapChars = opts.overlap * 4
    
    let start = 0
    let chunkIndex = 0
    
    while (start < cleanContent.length) {
      const end = Math.min(start + maxChars, cleanContent.length)
      const chunkContent = cleanContent.slice(start, end)
      
      chunks.push({
        content: chunkContent,
        index: chunkIndex++,
        tokenCount: estimateTokens(chunkContent),
        metadata: {},
      })
      
      start = end - overlapChars
    }
  }
  
  return chunks
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function getOverlapText(text: string, overlapTokens: number): string {
  const words = text.split(/\s+/)
  const overlapWords = Math.ceil(overlapTokens * 0.75) // ~0.75 words per token
  return words.slice(-overlapWords).join(' ')
}
\`\`\`

### Task 3.2: Create Ingestion Service

\`\`\`typescript
// lib/ai/ingestion.ts
import { createAdminClient } from '@/lib/supabase/server'
import { getVectorClient } from '@/lib/vector/client'
import { generateEmbeddings } from '@/lib/ai/embeddings'
import { chunkContent, Chunk } from '@/lib/ai/chunking'
import crypto from 'crypto'

export interface DocumentInput {
  slug: string
  title: string
  description?: string
  content: string
}

export interface IngestionResult {
  documentId: string
  chunksCreated: number
  vectorsUpserted: number
  skipped: boolean
}

/**
 * Ingest a single document into the search system
 */
export async function ingestDocument(
  input: DocumentInput
): Promise<IngestionResult> {
  const supabase = createAdminClient()
  const vectorClient = getVectorClient()
  
  // Calculate content checksum
  const checksum = crypto
    .createHash('md5')
    .update(input.content)
    .digest('hex')
  
  // Check if document exists and hasn't changed
  const { data: existingDoc } = await supabase
    .from('documents')
    .select('id, checksum')
    .eq('slug', input.slug)
    .single()
  
  if (existingDoc?.checksum === checksum) {
    return {
      documentId: existingDoc.id,
      chunksCreated: 0,
      vectorsUpserted: 0,
      skipped: true,
    }
  }
  
  // Upsert document
  const { data: document, error: docError } = await supabase
    .from('documents')
    .upsert({
      slug: input.slug,
      title: input.title,
      description: input.description || '',
      content: input.content,
      checksum,
      word_count: input.content.split(/\s+/).length,
    }, {
      onConflict: 'slug',
    })
    .select('id')
    .single()
  
  if (docError || !document) {
    throw new Error(`Failed to upsert document: ${docError?.message}`)
  }
  
  // Delete old chunks if updating
  if (existingDoc) {
    await supabase
      .from('doc_chunks')
      .delete()
      .eq('document_id', document.id)
    
    // Delete old vectors
    const oldVectorIds = Array.from(
      { length: 100 },
      (_, i) => `${existingDoc.id}-chunk-${i}`
    )
    await vectorClient.delete(oldVectorIds)
  }
  
  // Chunk the content
  const chunks = chunkContent(input.content, {
    maxTokens: 500,
    overlap: 50,
    preserveParagraphs: true,
  })
  
  // Insert chunks into Supabase
  const { error: chunksError } = await supabase
    .from('doc_chunks')
    .insert(
      chunks.map((chunk) => ({
        document_id: document.id,
        chunk_index: chunk.index,
        content: chunk.content,
        token_count: chunk.tokenCount,
        metadata: chunk.metadata,
      }))
    )
  
  if (chunksError) {
    throw new Error(`Failed to insert chunks: ${chunksError.message}`)
  }
  
  // Generate embeddings for all chunks
  const embeddings = await generateEmbeddings(chunks.map((c) => c.content))
  
  // Upsert vectors to Upstash
  const vectors = chunks.map((chunk, i) => ({
    id: `${document.id}-chunk-${chunk.index}`,
    vector: embeddings[i],
    metadata: {
      documentId: document.id,
      chunkId: `${document.id}-chunk-${chunk.index}`,
      slug: input.slug,
      title: input.title,
      content: chunk.content,
      chunkIndex: chunk.index,
    },
  }))
  
  await vectorClient.upsert(vectors)
  
  return {
    documentId: document.id,
    chunksCreated: chunks.length,
    vectorsUpserted: vectors.length,
    skipped: false,
  }
}

/**
 * Ingest multiple documents (batch)
 */
export async function ingestDocuments(
  documents: DocumentInput[]
): Promise<IngestionResult[]> {
  const results: IngestionResult[] = []
  
  // Process in batches to avoid rate limits
  const batchSize = 5
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map((doc) => ingestDocument(doc))
    )
    results.push(...batchResults)
    
    // Small delay between batches
    if (i + batchSize < documents.length) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  
  return results
}
\`\`\`

### Task 3.3: Create Ingestion API Route

\`\`\`typescript
// app/api/ingest/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ingestDocument, ingestDocuments } from '@/lib/ai/ingestion'

// Protect this endpoint with a secret key
const INGEST_SECRET = process.env.INGEST_SECRET_KEY

export async function POST(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${INGEST_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  try {
    const body = await request.json()
    
    // Handle single document
    if (body.slug && body.content) {
      const result = await ingestDocument(body)
      return NextResponse.json({ success: true, result })
    }
    
    // Handle batch
    if (Array.isArray(body.documents)) {
      const results = await ingestDocuments(body.documents)
      return NextResponse.json({
        success: true,
        results,
        summary: {
          total: results.length,
          processed: results.filter((r) => !r.skipped).length,
          skipped: results.filter((r) => r.skipped).length,
        },
      })
    }
    
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Ingestion error:', error)
    return NextResponse.json(
      { error: 'Ingestion failed', details: String(error) },
      { status: 500 }
    )
  }
}
\`\`\`

### Task 3.4: Create Ingestion Script

\`\`\`typescript
// scripts/ingest-docs.ts
/**
 * Run this script to ingest all documentation pages
 * Usage: npx tsx scripts/ingest-docs.ts
 */

import { pages } from '../lib/docs/pages'

const INGEST_URL = process.env.NEXT_PUBLIC_APP_URL + '/api/ingest'
const INGEST_SECRET = process.env.INGEST_SECRET_KEY

async function main() {
  console.log('Starting documentation ingestion...\n')
  
  const documents = Object.entries(pages).map(([slug, page]) => ({
    slug,
    title: page.title,
    description: page.description,
    content: page.content,
  }))
  
  console.log(`Found ${documents.length} documents to ingest\n`)
  
  const response = await fetch(INGEST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${INGEST_SECRET}`,
    },
    body: JSON.stringify({ documents }),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Ingestion failed: ${error}`)
  }
  
  const result = await response.json()
  
  console.log('Ingestion complete!')
  console.log(`  Total: ${result.summary.total}`)
  console.log(`  Processed: ${result.summary.processed}`)
  console.log(`  Skipped (unchanged): ${result.summary.skipped}`)
}

main().catch(console.error)
\`\`\`

---

## Phase 4: Search API Implementation

### Task 4.1: Create Search Service

\`\`\`typescript
// lib/ai/search.ts
import { getVectorClient, SearchResult } from '@/lib/vector/client'
import { generateEmbedding } from '@/lib/ai/embeddings'
import { createClient } from '@/lib/supabase/server'

export interface SearchOptions {
  limit?: number
  threshold?: number
  includeContent?: boolean
}

export interface SearchResponse {
  results: Array<{
    id: string
    slug: string
    title: string
    description: string
    content?: string
    score: number
    highlights: string[]
  }>
  query: string
  totalResults: number
}

const DEFAULT_OPTIONS: Required<SearchOptions> = {
  limit: 10,
  threshold: 0.7,
  includeContent: true,
}

/**
 * Perform semantic search across documentation
 */
export async function searchDocuments(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const vectorClient = getVectorClient()
  
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query)
  
  // Search for similar vectors
  const vectorResults = await vectorClient.query({
    vector: queryEmbedding,
    topK: opts.limit * 2, // Get more results for deduplication
    includeMetadata: true,
    includeVectors: false,
  })
  
  // Filter by threshold and deduplicate by document
  const seenDocuments = new Set<string>()
  const filteredResults: SearchResult[] = []
  
  for (const result of vectorResults) {
    if (result.score < opts.threshold) continue
    
    const documentId = result.metadata?.documentId as string
    if (seenDocuments.has(documentId)) continue
    
    seenDocuments.add(documentId)
    filteredResults.push({
      id: result.id,
      score: result.score,
      metadata: result.metadata as SearchResult['metadata'],
    })
    
    if (filteredResults.length >= opts.limit) break
  }
  
  // Fetch full document details from Supabase
  const supabase = await createClient()
  const documentIds = filteredResults.map((r) => r.metadata.documentId)
  
  const { data: documents } = await supabase
    .from('documents')
    .select('id, slug, title, description, content')
    .in('id', documentIds)
  
  const documentMap = new Map(documents?.map((d) => [d.id, d]) || [])
  
  // Build response with highlights
  const results = filteredResults.map((result) => {
    const doc = documentMap.get(result.metadata.documentId)
    return {
      id: result.metadata.documentId,
      slug: result.metadata.slug,
      title: result.metadata.title,
      description: doc?.description || '',
      content: opts.includeContent ? result.metadata.content : undefined,
      score: result.score,
      highlights: extractHighlights(result.metadata.content, query),
    }
  })
  
  return {
    results,
    query,
    totalResults: results.length,
  }
}

/**
 * Extract relevant text snippets containing query terms
 */
function extractHighlights(content: string, query: string): string[] {
  const highlights: string[] = []
  const queryTerms = query.toLowerCase().split(/\s+/)
  const sentences = content.split(/[.!?]+/)
  
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase()
    const hasMatch = queryTerms.some((term) => lowerSentence.includes(term))
    
    if (hasMatch && sentence.trim().length > 20) {
      highlights.push(sentence.trim())
      if (highlights.length >= 2) break
    }
  }
  
  // Fallback to first sentence if no matches
  if (highlights.length === 0 && sentences[0]) {
    highlights.push(sentences[0].trim())
  }
  
  return highlights
}
\`\`\`

### Task 4.2: Create Search API Route

\`\`\`typescript
// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { searchDocuments } from '@/lib/ai/search'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const limit = parseInt(searchParams.get('limit') || '10', 10)
  
  if (!query || query.trim().length < 2) {
    return NextResponse.json(
      { error: 'Query must be at least 2 characters' },
      { status: 400 }
    )
  }
  
  try {
    const results = await searchDocuments(query, { limit })
    
    // Track search analytics (async, don't await)
    trackSearchAnalytics(query, results.totalResults).catch(console.error)
    
    return NextResponse.json(results)
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}

async function trackSearchAnalytics(query: string, resultsCount: number) {
  const supabase = createAdminClient()
  await supabase.from('search_analytics').insert({
    query,
    results_count: resultsCount,
  })
}
\`\`\`

---

## Phase 5: AI Chat Integration

### Task 5.1: Create RAG Chat Service

\`\`\`typescript
// lib/ai/chat.ts
import { streamText, generateText } from 'ai'
import { searchDocuments } from '@/lib/ai/search'

const SYSTEM_PROMPT = `You are a helpful documentation assistant. Your role is to help users find information and answer questions about the documentation.

Guidelines:
- Answer questions based on the provided context from the documentation
- If the context doesn't contain enough information, say so honestly
- Provide code examples when relevant
- Keep responses concise but thorough
- Use markdown formatting for better readability
- Reference specific documentation pages when applicable

If you cannot find relevant information in the context, suggest the user:
1. Try rephrasing their question
2. Browse the documentation directly
3. Check the search results for related topics`

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  stream?: boolean
  maxContextDocs?: number
}

/**
 * Generate a chat response using RAG (Retrieval Augmented Generation)
 */
export async function generateChatResponse(
  messages: ChatMessage[],
  options: ChatOptions = {}
) {
  const { stream = true, maxContextDocs = 5 } = options
  
  // Get the latest user message for context retrieval
  const lastUserMessage = messages
    .filter((m) => m.role === 'user')
    .pop()?.content || ''
  
  // Retrieve relevant documentation context
  const searchResults = await searchDocuments(lastUserMessage, {
    limit: maxContextDocs,
    threshold: 0.6,
    includeContent: true,
  })
  
  // Build context from search results
  const context = searchResults.results
    .map((result, i) => {
      return `[Document ${i + 1}: ${result.title}]
URL: /docs/${result.slug}
Content:
${result.content}
---`
    })
    .join('\n\n')
  
  // Build the messages array with context
  const systemMessage = `${SYSTEM_PROMPT}

Here is the relevant documentation context:

${context}

If no context is provided or it's not relevant, let the user know you couldn't find specific information about their question.`

  const aiMessages = [
    { role: 'system' as const, content: systemMessage },
    ...messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ]
  
  if (stream) {
    return streamText({
      model: 'openai/gpt-4o-mini',
      messages: aiMessages,
      temperature: 0.7,
      maxTokens: 1000,
    })
  }
  
  return generateText({
    model: 'openai/gpt-4o-mini',
    messages: aiMessages,
    temperature: 0.7,
    maxTokens: 1000,
  })
}

/**
 * Generate suggested follow-up questions
 */
export async function generateSuggestedQuestions(
  context: string
): Promise<string[]> {
  const { text } = await generateText({
    model: 'openai/gpt-4o-mini',
    prompt: `Based on this documentation context, suggest 3 helpful questions a user might want to ask. Return only the questions, one per line, no numbering or bullets.

Context:
${context}`,
    temperature: 0.8,
    maxTokens: 200,
  })
  
  return text
    .split('\n')
    .map((q) => q.trim())
    .filter((q) => q.length > 0)
    .slice(0, 3)
}
\`\`\`

### Task 5.2: Create Chat API Route

\`\`\`typescript
// app/api/chat/route.ts
import { NextRequest } from 'next/server'
import { generateChatResponse, ChatMessage } from '@/lib/ai/chat'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const messages: ChatMessage[] = body.messages || []
    
    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    const result = await generateChatResponse(messages, { stream: true })
    
    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('Chat error:', error)
    return new Response(
      JSON.stringify({ error: 'Chat generation failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
\`\`\`

---

## Phase 6: UI Integration

### Task 6.1: Create Search Hook

\`\`\`typescript
// hooks/use-ai-search.ts
'use client'

import { useState, useCallback } from 'react'
import { useDebounce } from '@/hooks/use-debounce'

export interface SearchResult {
  id: string
  slug: string
  title: string
  description: string
  score: number
  highlights: string[]
}

export interface UseAISearchOptions {
  debounceMs?: number
  minQueryLength?: number
}

export function useAISearch(options: UseAISearchOptions = {}) {
  const { debounceMs = 300, minQueryLength = 2 } = options
  
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const debouncedQuery = useDebounce(query, debounceMs)
  
  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minQueryLength) {
      setResults([])
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&limit=10`
      )
      
      if (!response.ok) {
        throw new Error('Search failed')
      }
      
      const data = await response.json()
      setResults(data.results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [minQueryLength])
  
  // Auto-search when debounced query changes
  useCallback(() => {
    if (debouncedQuery) {
      search(debouncedQuery)
    }
  }, [debouncedQuery, search])
  
  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    search,
  }
}
\`\`\`

### Task 6.2: Create AI Chat Hook

\`\`\`typescript
// hooks/use-ai-chat.ts
'use client'

import { useState, useCallback } from 'react'
import { useChat as useVercelChat } from 'ai/react'

export interface UseAIChatOptions {
  initialMessages?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const [isOpen, setIsOpen] = useState(false)
  
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    reload,
    stop,
    setMessages,
  } = useVercelChat({
    api: '/api/chat',
    initialMessages: options.initialMessages,
  })
  
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])
  
  const clearHistory = useCallback(() => {
    setMessages([])
  }, [setMessages])
  
  return {
    // State
    messages,
    input,
    isLoading,
    error,
    isOpen,
    
    // Actions
    handleInputChange,
    handleSubmit,
    reload,
    stop,
    clearHistory,
    open,
    close,
    toggle,
  }
}
\`\`\`

### Task 6.3: Update Command Palette with AI Search

\`\`\`typescript
// components/search/ai-search-results.tsx
'use client'

import { FileText, Sparkles } from 'lucide-react'
import { CommandGroup, CommandItem } from '@/components/ui/command'
import { useRouter } from 'next/navigation'

interface SearchResult {
  id: string
  slug: string
  title: string
  description: string
  score: number
  highlights: string[]
}

interface AISearchResultsProps {
  results: SearchResult[]
  isLoading: boolean
  onSelect: () => void
}

export function AISearchResults({
  results,
  isLoading,
  onSelect,
}: AISearchResultsProps) {
  const router = useRouter()
  
  if (isLoading) {
    return (
      <CommandGroup heading="AI Search">
        <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span>Searching documentation...</span>
        </div>
      </CommandGroup>
    )
  }
  
  if (results.length === 0) {
    return null
  }
  
  return (
    <CommandGroup heading="AI Search Results">
      {results.map((result) => (
        <CommandItem
          key={result.id}
          value={`ai-${result.slug}`}
          onSelect={() => {
            router.push(`/docs/${result.slug}`)
            onSelect()
          }}
          className="group"
        >
          <FileText className="mr-2 h-4 w-4 text-muted-foreground group-data-[selected=true]:text-white" />
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{result.title}</span>
            {result.highlights[0] && (
              <span className="text-xs text-muted-foreground group-data-[selected=true]:text-white/80 line-clamp-1">
                {result.highlights[0]}
              </span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-indigo-500" />
            <span className="text-xs text-muted-foreground">
              {Math.round(result.score * 100)}%
            </span>
          </div>
        </CommandItem>
      ))}
    </CommandGroup>
  )
}
\`\`\`

### Task 6.4: Update Assistant Sheet with AI Chat

\`\`\`typescript
// components/assistant/ai-chat-messages.tsx
'use client'

import { useRef, useEffect } from 'react'
import { User, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface AIChatMessagesProps {
  messages: Message[]
  isLoading: boolean
}

export function AIChatMessages({ messages, isLoading }: AIChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <Bot className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-2">Documentation Assistant</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Ask me anything about the documentation. I can help you find
          information, explain concepts, and provide code examples.
        </p>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col gap-4 p-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            'flex gap-3',
            message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
              message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
            )}
          >
            {message.role === 'user' ? (
              <User className="h-4 w-4" />
            ) : (
              <Bot className="h-4 w-4" />
            )}
          </div>
          <div
            className={cn(
              'rounded-lg px-3 py-2 max-w-[85%] prose prose-sm dark:prose-invert',
              message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
            )}
          >
            {message.content}
          </div>
        </div>
      ))}
      
      {isLoading && (
        <div className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <Bot className="h-4 w-4" />
          </div>
          <div className="rounded-lg px-3 py-2 bg-muted">
            <div className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-foreground/50 animate-bounce" />
              <span className="h-2 w-2 rounded-full bg-foreground/50 animate-bounce [animation-delay:0.1s]" />
              <span className="h-2 w-2 rounded-full bg-foreground/50 animate-bounce [animation-delay:0.2s]" />
            </div>
          </div>
        </div>
      )}
      
      <div ref={bottomRef} />
    </div>
  )
}
\`\`\`

---

## Phase 7: Testing & Optimization

### Task 7.1: Test Search Quality

Create a test suite for search quality:

\`\`\`typescript
// __tests__/search.test.ts
import { searchDocuments } from '@/lib/ai/search'

const TEST_QUERIES = [
  { query: 'how to get started', expectedSlug: 'quickstart' },
  { query: 'install CLI', expectedSlug: 'cli' },
  { query: 'authentication setup', expectedSlug: 'authentication' },
  { query: 'API reference', expectedSlug: 'api-reference' },
]

describe('Search Quality', () => {
  test.each(TEST_QUERIES)(
    'query "$query" should return $expectedSlug in top results',
    async ({ query, expectedSlug }) => {
      const results = await searchDocuments(query, { limit: 5 })
      
      const foundInTop5 = results.results.some(
        (r) => r.slug.includes(expectedSlug)
      )
      
      expect(foundInTop5).toBe(true)
    }
  )
})
\`\`\`

### Task 7.2: Monitor and Analyze

Set up search analytics dashboard:

\`\`\`sql
-- Useful queries for search analytics

-- Most common searches
SELECT query, COUNT(*) as count
FROM search_analytics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY query
ORDER BY count DESC
LIMIT 20;

-- Searches with no results
SELECT query, COUNT(*) as count
FROM search_analytics
WHERE results_count = 0
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY query
ORDER BY count DESC
LIMIT 20;

-- Search volume over time
SELECT DATE(created_at) as date, COUNT(*) as searches
FROM search_analytics
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date;
\`\`\`

### Task 7.3: Optimization Checklist

- [ ] **Embedding caching**: Cache embeddings for common queries
- [ ] **Result caching**: Use Vercel KV or similar for caching search results
- [ ] **Rate limiting**: Implement rate limiting on search/chat endpoints
- [ ] **Error handling**: Add comprehensive error handling and fallbacks
- [ ] **Monitoring**: Set up alerts for failed searches and high latency
- [ ] **A/B testing**: Test different chunk sizes and overlap settings

---

## Phase 8: Deployment

### Task 8.1: Environment Variables Checklist

Ensure all environment variables are set in Vercel:

\`\`\`env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Upstash Vector
UPSTASH_VECTOR_REST_URL=
UPSTASH_VECTOR_REST_TOKEN=

# Ingestion (generate a secure random string)
INGEST_SECRET_KEY=

# App URL (for scripts)
NEXT_PUBLIC_APP_URL=
\`\`\`

### Task 8.2: Deployment Steps

1. **Deploy to Vercel**
   \`\`\`bash
   vercel deploy --prod
   \`\`\`

2. **Run database migrations**
   - Execute SQL scripts in Supabase SQL editor
   - Or use the v0 script runner

3. **Initial content ingestion**
   \`\`\`bash
   npx tsx scripts/ingest-docs.ts
   \`\`\`

4. **Verify search functionality**
   - Test search with various queries
   - Verify AI chat responses
   - Check analytics are being recorded

### Task 8.3: Continuous Ingestion

Set up automated re-ingestion when documentation changes:

\`\`\`typescript
// app/api/webhook/docs-updated/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ingestDocuments } from '@/lib/ai/ingestion'
import { pages } from '@/lib/docs/pages'

export async function POST(request: NextRequest) {
  // Verify webhook signature (implement based on your CI/CD provider)
  const signature = request.headers.get('x-webhook-signature')
  
  // Re-ingest all documents
  const documents = Object.entries(pages).map(([slug, page]) => ({
    slug,
    title: page.title,
    description: page.description,
    content: page.content,
  }))
  
  const results = await ingestDocuments(documents)
  
  return NextResponse.json({
    success: true,
    processed: results.filter((r) => !r.skipped).length,
    skipped: results.filter((r) => r.skipped).length,
  })
}
\`\`\`

---

## Summary

This implementation provides:

1. **Semantic Search**: Users can search using natural language queries
2. **AI-Powered Chat**: RAG-based assistant that answers questions using documentation context
3. **Analytics**: Track search queries to improve content and search quality
4. **Scalability**: Vector database handles large documentation sets efficiently
5. **Cost Efficiency**: Uses AI Gateway for optimized API costs

### Estimated Implementation Time

| Phase | Estimated Time |
|-------|---------------|
| Phase 1: Supabase Setup | 1-2 hours |
| Phase 2: Upstash Vector Setup | 30 minutes |
| Phase 3: Content Ingestion | 2-3 hours |
| Phase 4: Search API | 1-2 hours |
| Phase 5: AI Chat | 2-3 hours |
| Phase 6: UI Integration | 2-3 hours |
| Phase 7: Testing | 1-2 hours |
| Phase 8: Deployment | 1 hour |
| **Total** | **11-17 hours** |

### Next Steps After Implementation

1. Monitor search analytics and optimize chunk sizes
2. Add feedback mechanism for search result quality
3. Implement caching for frequently searched queries
4. Consider adding conversation history persistence
5. Explore fine-tuning embeddings for domain-specific terminology
