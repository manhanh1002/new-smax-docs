/**
 * Hybrid Search Module for RAG Chat
 *
 * Combines:
 * 1. Vector similarity search (embedding-based)
 * 2. Full-text search (tsvector)
 * 3. Trigram similarity (pg_trgm)
 *
 * Weighted scoring: vector * 0.5 + text * 0.3 + trigram * 0.2
 */

import { supabaseAdmin } from './supabase-admin'

export interface SearchResult {
  id: string
  content: string
  similarity: number
  title: string
  url?: string
  document_path?: string
  document_title?: string
  vector_score?: number
  text_score?: number
  trigram_score?: number
}

export interface HybridSearchOptions {
  queryEmbedding?: number[]  // Optional: if not provided, skip vector search
  queryText: string         // Required: for text and trigram search
  lang?: string
  matchThreshold?: number
  matchCount?: number
  vectorWeight?: number
  textWeight?: number
  trigramWeight?: number
}

const DEFAULT_WEIGHTS = {
  vectorWeight: 0.5,
  textWeight: 0.3,
  trigramWeight: 0.2
}

/**
 * Perform hybrid search combining vector, full-text, and trigram similarity
 */
export async function hybridSearch(options: HybridSearchOptions): Promise<SearchResult[]> {
  const {
    queryEmbedding,
    queryText,
    lang,
    matchThreshold = 0.1,
    matchCount = 10,
    vectorWeight = DEFAULT_WEIGHTS.vectorWeight,
    textWeight = DEFAULT_WEIGHTS.textWeight,
    trigramWeight = DEFAULT_WEIGHTS.trigramWeight
  } = options

  try {
    // If we have query embedding, use full hybrid search
    if (queryEmbedding && queryEmbedding.length > 0) {
      const { data, error } = await supabaseAdmin.rpc('match_documents_hybrid', {
        query_embedding: queryEmbedding,
        match_threshold: matchThreshold,
        match_count: matchCount,
        filter_lang: lang || null,
        query_text: queryText,
        vector_weight: vectorWeight,
        text_weight: textWeight,
        trigram_weight: trigramWeight
      })

      if (error) {
        console.error('[HybridSearch] RPC error:', error)
        // Fallback to vector-only if hybrid fails
        return vectorSearch(queryEmbedding, lang, matchThreshold, matchCount)
      }

      return mapResults(data || [])
    } else {
      // No embedding - use keyword search only
      return keywordSearch(queryText, lang, matchCount)
    }
  } catch (error) {
    console.error('[HybridSearch] Error:', error)
    // Fallback to vector-only
    if (queryEmbedding) {
      return vectorSearch(queryEmbedding, lang, matchThreshold, matchCount)
    }
    return []
  }
}

/**
 * Vector similarity search (original method)
 */
export async function vectorSearch(
  queryEmbedding: number[],
  lang?: string,
  matchThreshold: number = 0.1,
  matchCount: number = 10
): Promise<SearchResult[]> {
  try {
    const { data, error } = await supabaseAdmin.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
      filter_lang: lang || null
    })

    if (error) {
      console.error('[VectorSearch] Error:', error)
      return []
    }

    return mapResults(data || [])
  } catch (error) {
    console.error('[VectorSearch] Error:', error)
    return []
  }
}

/**
 * Keyword-only search (for non-vector queries)
 */
export async function keywordSearch(
  queryText: string,
  lang?: string,
  matchCount: number = 10
): Promise<SearchResult[]> {
  try {
    const { data, error } = await supabaseAdmin.rpc('match_documents_keyword', {
      query_text: queryText,
      match_count: matchCount,
      filter_lang: lang || null
    })

    if (error) {
      console.error('[KeywordSearch] Error:', error)
      return []
    }

    return (data || []).map((r: any) => ({
      id: r.id,
      content: r.content,
      similarity: r.text_score || 0,
      title: r.document_title || 'Untitled',
      document_path: r.document_path,
      document_title: r.document_title,
      text_score: r.text_score,
      trigram_score: r.trigram_score
    }))
  } catch (error) {
    console.error('[KeywordSearch] Error:', error)
    return []
  }
}

/**
 * Map RPC results to SearchResult interface
 */
function mapResults(data: any[]): SearchResult[] {
  return (data || []).map((r: any) => ({
    id: r.id,
    content: r.content,
    similarity: r.similarity,
    title: r.document_title || r.title || 'Untitled',
    document_path: r.document_path,
    document_title: r.document_title,
    vector_score: r.vector_score,
    text_score: r.text_score,
    trigram_score: r.trigram_score
  }))
}

/**
 * Adjust weights based on query type
 */
export function getSearchWeights(intent: string): {
  vectorWeight: number
  textWeight: number
  trigramWeight: number
} {
  switch (intent) {
    case 'comparison':
      // Comparisons need exact keyword matches more than embeddings
      return { vectorWeight: 0.3, textWeight: 0.5, trigramWeight: 0.2 }

    case 'how_to':
      // How-to needs both conceptual (vector) and exact terms (text)
      return { vectorWeight: 0.5, textWeight: 0.35, trigramWeight: 0.15 }

    case 'troubleshooting':
      // Troubleshooting benefits from exact error messages (text)
      return { vectorWeight: 0.4, textWeight: 0.4, trigramWeight: 0.2 }

    case 'feature_inquiry':
      // Feature queries work well with semantic understanding
      return { vectorWeight: 0.6, textWeight: 0.25, trigramWeight: 0.15 }

    default:
      return DEFAULT_WEIGHTS
  }
}
