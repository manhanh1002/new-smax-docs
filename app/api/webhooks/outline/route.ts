// app/api/webhooks/outline/route.ts
// Webhook handler for Outline events

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyOutlineSignature, getLanguageFromCollection, generateSlug, OutlineWebhookPayload } from '@/lib/outline'
import { processDocumentForRAG } from '@/lib/embeddings'

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('Outline-Signature') || ''
    const secret = process.env.OUTLINE_WEBHOOK_SECRET || ''

    // 1. Verify Signature
    if (secret && !verifyOutlineSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const body = JSON.parse(rawBody) as OutlineWebhookPayload
    const { event, payload } = body

    // 2. Filter Events: only handle publish or update
    if (event !== 'documents.publish' && event !== 'documents.update') {
      return NextResponse.json({ message: 'Event ignored' }, { status: 200 })
    }

    // 3. Determine Language
    const lang = getLanguageFromCollection(payload.collectionId)
    if (!lang) {
      console.warn(`Collection ID ${payload.collectionId} not mapped to a language. Skipping.`)
      return NextResponse.json({ message: 'Collection not supported' }, { status: 200 })
    }

    // 4. Upsert Document Metadata
    const slug = payload.urlId || generateSlug(payload.title)
    const { data: document, error: upsertError } = await supabaseAdmin
      .from('documents')
      .upsert({
        external_id: payload.id,
        title: payload.title,
        slug: slug,
        language: lang,
        path: `/${lang}/docs/${slug}`, // Simplified path logic
        content: payload.text,
        last_updated: payload.updatedAt,
        meta: {
          collectionId: payload.collectionId,
          url: payload.url,
          collaboratorIds: payload.collaboratorIds,
        },
      }, { onConflict: 'external_id' })
      .select()
      .single()

    if (upsertError) {
      console.error('Error upserting document:', upsertError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // 5. Trigger RAG Processing (Chunking & Embedding)
    // We do this asynchronously or blocking depending on Vercel timeout limits.
    // For simplicity, blocking for now. If it times out, we should move to background jobs (Inngest/Trigger.dev).
    try {
      await processDocumentForRAG(document.id, payload.text)
    } catch (ragError) {
      console.error('Error processing RAG:', ragError)
      // We don't fail the webhook if RAG fails, but we should log it or retry
      // Return 202 Accepted maybe? But we already committed the document.
    }

    return NextResponse.json({ message: 'Success', documentId: document.id }, { status: 200 })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
