// app/api/admin/sync/route.ts
// Sync documents from Outline to Supabase

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getOutlineDocuments, getLanguageFromCollection, type OutlineDocument } from '@/lib/outline'

import { processDocumentForRAG } from '@/lib/embeddings'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'sync-documents') {
      return await syncDocuments()
    }
    
    if (action === 'generate-embeddings') {
      return await generateEmbeddings()
    }

    if (action === 'force-chunking') {
      return await forceChunking()
    }

    return NextResponse.json({ error: 'Invalid action. Use: sync-documents, generate-embeddings, or force-chunking' }, { status: 400 })
  } catch (error) {
    console.error('Admin sync error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function syncDocuments() {
  console.log('[Sync] Starting document sync from Outline...')
  
  // Get all documents from Outline
  const outlineDocs = await getOutlineDocuments(undefined, { limit: 100 })
  console.log(`[Sync] Found ${outlineDocs.length} documents on Outline`)

  // Get existing documents in Supabase
  const { data: existingDocs } = await supabaseAdmin
    .from('documents')
    .select('id')
  
  const existingIds = new Set(existingDocs?.map(d => d.id) || [])
  console.log(`[Sync] Found ${existingIds.size} existing documents in Supabase`)

  // Filter out documents that already exist
  const newDocs = outlineDocs.filter(doc => !existingIds.has(doc.id))
  console.log(`[Sync] ${newDocs.length} new documents to sync`)

  if (newDocs.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'All documents are already synced',
      total: outlineDocs.length,
      new: 0,
      existing: existingIds.size
    })
  }

  // Insert new documents - match existing schema
  const docsToInsert = newDocs.map(doc => ({
    id: doc.id,
    external_id: doc.urlId || doc.id,
    title: doc.title,
    slug: doc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    language: getLanguageFromCollection(doc.collectionId) || 'vi',
    path: doc.url || '',
    content: doc.text || '',
    meta: {
      outline_url: doc.url,
      collection_id: doc.collectionId,
      parent_document_id: doc.parentDocumentId,
      published_at: doc.publishedAt,
      outline_created_at: doc.createdAt,
      outline_updated_at: doc.updatedAt,
    },
    last_updated: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  }))

  const { error: insertError } = await supabaseAdmin
    .from('documents')
    .insert(docsToInsert)

  if (insertError) {
    console.error('[Sync] Insert error:', insertError)
    return NextResponse.json({
      success: false,
      error: insertError.message
    }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: `Synced ${newDocs.length} new documents`,
    total: outlineDocs.length,
    new: newDocs.length,
    existing: existingIds.size,
    newDocuments: newDocs.map(d => d.title)
  })
}

async function generateEmbeddings() {
  console.log('[Embeddings] Starting embedding generation...')
  
  // Get documents without embeddings
  const { data: docsWithoutEmbeddings, error } = await supabaseAdmin
    .from('documents')
    .select('id, title, content')
    .is('embedding', null)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  if (!docsWithoutEmbeddings || docsWithoutEmbeddings.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'All documents already have embeddings'
    })
  }

  console.log(`[Embeddings] ${docsWithoutEmbeddings.length} documents need embeddings`)

  // Generate embeddings for each document
  const results: { id: string; title: string; status: string }[] = []
  
  for (const doc of docsWithoutEmbeddings) {
    try {
      console.log(`[Embeddings] Processing: ${doc.title}`)
      
      // Call the embedding API
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY!,
        },
        body: JSON.stringify({
          content: {
            parts: [{ text: doc.content?.slice(0, 8000) || doc.title }],
          },
          outputDimensionality: 768, // Match database vector(768)
        }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error?.message || `API error: ${response.status}`)
      }

      const data = await response.json()
      const embedding = data.embedding?.values

      if (!embedding) {
        throw new Error('No embedding in response')
      }

      // Update document with embedding
      const { error: updateError } = await supabaseAdmin
        .from('documents')
        .update({ embedding })
        .eq('id', doc.id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      results.push({ id: doc.id, title: doc.title, status: 'success' })
      console.log(`[Embeddings] ✓ ${doc.title}`)
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      results.push({ id: doc.id, title: doc.title, status: `failed: ${errorMsg}` })
      console.error(`[Embeddings] ✗ ${doc.title}:`, errorMsg)
    }
  }

  const successCount = results.filter(r => r.status === 'success').length
  
  return NextResponse.json({
    success: true,
    message: `Generated embeddings for ${successCount}/${docsWithoutEmbeddings.length} documents`,
    total: docsWithoutEmbeddings.length,
    successCount: successCount,
    failedCount: docsWithoutEmbeddings.length - successCount,
    results
  })
}

async function forceChunking() {
  console.log('[Chunking] Starting forced chunking...')
  
  // Get all documents
  const { data: docs, error } = await supabaseAdmin
    .from('documents')
    .select('id, title, content')
  
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  if (!docs || docs.length === 0) {
    return NextResponse.json({ success: true, message: 'No documents found' })
  }

  console.log(`[Chunking] Processing ${docs.length} documents`)
  
  const results: { id: string; title: string; status: string }[] = []
  
  // Process sequentially to avoid rate limits
  for (const doc of docs) {
    try {
      if (!doc.content) {
        results.push({ id: doc.id, title: doc.title, status: 'skipped (no content)' })
        continue
      }
      
      console.log(`[Chunking] Processing: ${doc.title}`)
      await processDocumentForRAG(doc.id, doc.content)
      results.push({ id: doc.id, title: doc.title, status: 'success' })
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      results.push({ id: doc.id, title: doc.title, status: `failed: ${errorMsg}` })
      console.error(`[Chunking] ✗ ${doc.title}:`, errorMsg)
    }
  }

  const successCount = results.filter(r => r.status === 'success').length

  return NextResponse.json({
    success: true,
    message: `Processed ${successCount}/${docs.length} documents`,
    total: docs.length,
    successCount,
    failedCount: docs.length - successCount,
    results
  })
}

export async function GET() {
  // Get sync status
  try {
    const { data: supabaseDocs, error } = await supabaseAdmin
      .from('documents')
      .select('id, title, embedding, language')
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const total = supabaseDocs?.length || 0
    const withEmbedding = supabaseDocs?.filter(d => d.embedding !== null).length || 0
    const withoutEmbedding = total - withEmbedding

    return NextResponse.json({
      status: 'ready',
      documents: {
        total,
        withEmbedding,
        withoutEmbedding
      },
      actions: ['sync-documents', 'generate-embeddings'],
      usage: 'POST with { "action": "sync-documents" } or { "action": "generate-embeddings" }'
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}