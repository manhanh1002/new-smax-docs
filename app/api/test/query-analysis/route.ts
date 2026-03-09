/**
 * Test API: Query Analysis & Multi-Query Search
 * 
 * GET: Test query analysis
 * POST: Test full RAG pipeline with analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { analyzeQuery, QueryIntent } from '@/lib/query-analysis'
import { generateEmbedding } from '@/lib/embeddings'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') || 'So sánh Zalo OA và Facebook Messenger'
  
  const analysis = analyzeQuery(query)
  
  return NextResponse.json({
    query,
    analysis: {
      intent: analysis.intent,
      isComplex: analysis.isComplex,
      subQueries: analysis.subQueries,
      expandedTerms: analysis.expandedTerms,
      suggestedMatchCount: analysis.suggestedMatchCount,
      suggestedThreshold: analysis.suggestedThreshold
    }
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query, lang = 'vi' } = body

    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 })
    }

    // 1. Analyze query
    const analysis = analyzeQuery(query)
    
    // 2. Generate embedding
    const embedding = await generateEmbedding(query)
    
    // 3. Search with dynamic parameters
    const { data, error } = await supabaseAdmin.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: analysis.suggestedThreshold,
      match_count: analysis.suggestedMatchCount,
      filter_lang: lang
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      query,
      analysis: {
        intent: analysis.intent,
        isComplex: analysis.isComplex,
        subQueries: analysis.subQueries,
        suggestedMatchCount: analysis.suggestedMatchCount,
        suggestedThreshold: analysis.suggestedThreshold
      },
      results: (data || []).map((r: any) => ({
        id: r.id,
        title: r.document_title,
        similarity: r.similarity,
        contentPreview: r.content?.substring(0, 200) + '...'
      })),
      resultCount: data?.length || 0
    })
  } catch (error) {
    return NextResponse.json({ 
      error: String(error) 
    }, { status: 500 })
  }
}