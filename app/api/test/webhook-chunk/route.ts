/**
 * Test API: Simulate webhook to test auto-chunking
 * 
 * GET: Check webhook status
 * POST: Test webhook with a sample document
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { processDocumentForRAG } from '@/lib/embeddings'

export async function GET() {
  try {
    // Get recent documents with their chunk status
    const { data: recentDocs, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, title, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(5)

    if (docError) {
      return NextResponse.json({ error: docError.message }, { status: 500 })
    }

    // Get chunk counts for these docs
    const docIds = recentDocs?.map(d => d.id) || []
    const { data: sections } = await supabaseAdmin
      .from('document_sections')
      .select('document_id')
      .in('document_id', docIds)

    const chunkCounts: Record<string, number> = {}
    for (const s of sections || []) {
      chunkCounts[s.document_id] = (chunkCounts[s.document_id] || 0) + 1
    }

    const docsWithChunks = recentDocs?.map(d => ({
      ...d,
      chunk_count: chunkCounts[d.id] || 0
    }))

    return NextResponse.json({
      message: 'Webhook chunk test API',
      recentDocuments: docsWithChunks,
      webhookEndpoint: '/api/webhooks/outline',
      events: ['documents.publish', 'documents.update']
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    
    // Get a test document (either provided or first available with content)
    let testDocId = body.documentId
    
    if (!testDocId) {
      // Find a document with content for testing
      const { data: docs } = await supabaseAdmin
        .from('documents')
        .select('id, title, content')
        .not('content', 'is', null)
        .limit(1)
        .single()
      
      if (!docs) {
        return NextResponse.json({ 
          error: 'No document with content found for testing' 
        }, { status: 400 })
      }
      
      testDocId = docs.id
    }

    // Get the document
    const { data: doc, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, title, content')
      .eq('id', testDocId)
      .single()

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    console.log(`[Test] Testing auto-chunking for: ${doc.title}`)

    // Delete existing chunks first (to test fresh)
    const { count: existingChunks } = await supabaseAdmin
      .from('document_sections')
      .delete()
      .eq('document_id', doc.id)

    console.log(`[Test] Deleted ${existingChunks || 0} existing chunks`)

    // Process the document
    const startTime = Date.now()
    const result = await processDocumentForRAG(doc.id, doc.content || '')
    const duration = Date.now() - startTime

    // Verify chunks were created
    const { data: newChunks, error: chunkError } = await supabaseAdmin
      .from('document_sections')
      .select('id, chunk_index, chunk_count')
      .eq('document_id', doc.id)
      .order('chunk_index')

    return NextResponse.json({
      success: result.success,
      document: {
        id: doc.id,
        title: doc.title,
        contentLength: doc.content?.length || 0
      },
      processingResult: result,
      chunksCreated: newChunks?.length || 0,
      chunks: newChunks,
      duration: `${(duration / 1000).toFixed(2)}s`,
      rateLimiting: {
        chunkDelayMs: 1500,
        retryCount: 3,
        retryDelayMs: 5000
      }
    })
  } catch (error) {
    console.error('[Test] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}