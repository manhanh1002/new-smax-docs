# Phase 4: Content Ingestion Pipeline

## Content Chunking

\`\`\`typescript
// lib/ai/chunking.ts
export interface Chunk {
  content: string
  index: number
  tokenCount: number
}

export function chunkContent(content: string, maxTokens = 500): Chunk[] {
  const chunks: Chunk[] = []
  const paragraphs = content.split(/\n\n+/)
  let current = ''
  let index = 0

  for (const para of paragraphs) {
    const paraTokens = Math.ceil(para.length / 4)
    const currentTokens = Math.ceil(current.length / 4)

    if (currentTokens + paraTokens > maxTokens && current) {
      chunks.push({
        content: current.trim(),
        index: index++,
        tokenCount: currentTokens,
      })
      current = para
    } else {
      current += (current ? '\n\n' : '') + para
    }
  }

  if (current.trim()) {
    chunks.push({
      content: current.trim(),
      index,
      tokenCount: Math.ceil(current.length / 4),
    })
  }

  return chunks
}
\`\`\`

## Ingestion Service

\`\`\`typescript
// lib/ai/ingestion.ts
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { getVectorClient } from '@/lib/vector/client'
import { generateEmbeddings } from '@/lib/ai/embeddings'
import { chunkContent } from '@/lib/ai/chunking'

export interface DocInput {
  slug: string
  title: string
  description?: string
  content: string
}

export async function ingestDocument(input: DocInput) {
  const supabase = createAdminClient()
  const vector = getVectorClient()
  const checksum = crypto.createHash('md5').update(input.content).digest('hex')

  // Check if unchanged
  const { data: existing } = await supabase
    .from('documents')
    .select('id, checksum')
    .eq('slug', input.slug)
    .single()

  if (existing?.checksum === checksum) {
    return { documentId: existing.id, skipped: true }
  }

  // Upsert document
  const { data: doc } = await supabase
    .from('documents')
    .upsert({
      slug: input.slug,
      title: input.title,
      description: input.description || '',
      content: input.content,
      checksum,
      word_count: input.content.split(/\s+/).length,
    }, { onConflict: 'slug' })
    .select('id')
    .single()

  if (!doc) throw new Error('Failed to upsert document')

  // Delete old data if updating
  if (existing) {
    await supabase.from('doc_chunks').delete().eq('document_id', doc.id)
    await vector.delete(
      Array.from({ length: 100 }, (_, i) => `${existing.id}-chunk-${i}`)
    )
  }

  // Chunk and embed
  const chunks = chunkContent(input.content)
  
  await supabase.from('doc_chunks').insert(
    chunks.map((c) => ({
      document_id: doc.id,
      chunk_index: c.index,
      content: c.content,
      token_count: c.tokenCount,
    }))
  )

  const embeddings = await generateEmbeddings(chunks.map((c) => c.content))

  await vector.upsert(
    chunks.map((chunk, i) => ({
      id: `${doc.id}-chunk-${chunk.index}`,
      vector: embeddings[i],
      metadata: {
        documentId: doc.id,
        chunkId: `${doc.id}-chunk-${chunk.index}`,
        slug: input.slug,
        title: input.title,
        content: chunk.content,
        chunkIndex: chunk.index,
      },
    }))
  )

  return { documentId: doc.id, chunks: chunks.length, skipped: false }
}
\`\`\`

## Ingestion API Route

\`\`\`typescript
// app/api/ingest/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ingestDocument } from '@/lib/ai/ingestion'

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.INGEST_SECRET_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const result = await ingestDocument(body)
  return NextResponse.json({ success: true, result })
}
\`\`\`

## Next Step

→ [Phase 5: Search API](./05-search-api.md)
