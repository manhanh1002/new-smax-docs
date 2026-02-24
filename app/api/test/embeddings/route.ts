// app/api/test/embeddings/route.ts
// Test endpoint for Gemini embeddings and vector search

import { NextRequest, NextResponse } from 'next/server'
import { generateEmbedding } from '@/lib/embeddings'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const testQuery = searchParams.get('q') || 'Smax.AI chatbot là gì?'
  const testEmbedding = searchParams.get('embedding') === 'true'

  const results: {
    embedding?: { success: boolean; dimension?: number; error?: string }
    vectorSearch?: { success: boolean; count?: number; results?: unknown[]; error?: string }
    supabaseConnection?: { success: boolean; error?: string }
  } = {}

  try {
    // 1. Test Supabase connection
    try {
      const { data, error } = await supabaseAdmin
        .from('documents')
        .select('id, title, language')
        .limit(5)
      
      if (error) {
        results.supabaseConnection = { success: false, error: error.message }
      } else {
        results.supabaseConnection = { success: true }
        console.log(`Supabase connected. Found ${data?.length || 0} documents`)
      }
    } catch (e) {
      results.supabaseConnection = { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
    }

    // 2. Test Gemini Embedding Generation
    if (testEmbedding || !searchParams.get('skipEmbedding')) {
      try {
        console.log('Testing Gemini embedding generation...')
        const startTime = Date.now()
        const embedding = await generateEmbedding(testQuery)
        const duration = Date.now() - startTime

        results.embedding = {
          success: true,
          dimension: embedding.length,
        }
        console.log(`Embedding generated: ${embedding.length} dimensions in ${duration}ms`)

        // 3. Test Vector Search with the generated embedding
        try {
          console.log('Testing vector search...')
          const { data: searchResults, error: searchError } = await supabaseAdmin.rpc(
            'search_documents',
            {
              query_embedding: embedding,
              match_threshold: 0.5,
              match_count: 5,
              filter_lang: null,
            }
          )

          if (searchError) {
            results.vectorSearch = { 
              success: false, 
              error: searchError.message 
            }
          } else {
            results.vectorSearch = {
              success: true,
              count: searchResults?.length || 0,
              results: searchResults?.map((r: { id: string; content: string; similarity: number; document_title?: string }) => ({
                id: r.id,
                title: r.document_title,
                similarity: r.similarity?.toFixed(4),
                contentPreview: r.content?.substring(0, 150) + '...',
              })),
            }
          }
        } catch (searchErr) {
          results.vectorSearch = { 
            success: false, 
            error: searchErr instanceof Error ? searchErr.message : 'Search failed' 
          }
        }
      } catch (embedErr) {
        results.embedding = {
          success: false,
          error: embedErr instanceof Error ? embedErr.message : 'Embedding failed',
        }
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      testQuery,
      results,
      config: {
        geminiApiKey: process.env.GEMINI_API_KEY ? 'configured' : 'missing',
        embeddingModel: process.env.EMBEDDING_MODEL || 'models/gemini-embedding-001',
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      },
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

// POST endpoint to manually insert a test document with embedding
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, content, language = 'vi' } = body

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Generate embedding
    console.log('Generating embedding for content...')
    const embedding = await generateEmbedding(content)

    // Insert document
    const { data: doc, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        title: title || 'Test Document',
        content: content,
        language: language,
        embedding: embedding,
      })
      .select()
      .single()

    if (docError) {
      return NextResponse.json({ error: docError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        title: doc.title,
        embeddingDimension: embedding.length,
      },
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}