# Phase 5: Search API Implementation

## Search Service

\`\`\`typescript
// lib/ai/search.ts
import { getVectorClient } from '@/lib/vector/client'
import { generateEmbedding } from '@/lib/ai/embeddings'
import { createClient } from '@/lib/supabase/server'

export interface SearchResult {
  id: string
  slug: string
  title: string
  description: string
  content: string
  score: number
  highlights: string[]
}

export async function searchDocuments(
  query: string,
  limit = 10,
  threshold = 0.7
): Promise<SearchResult[]> {
  const vector = getVectorClient()
  const queryEmbedding = await generateEmbedding(query)

  const results = await vector.query({
    vector: queryEmbedding,
    topK: limit * 2,
    includeMetadata: true,
  })

  // Deduplicate by document
  const seen = new Set<string>()
  const filtered = results
    .filter((r) => r.score >= threshold)
    .filter((r) => {
      const docId = r.metadata?.documentId as string
      if (seen.has(docId)) return false
      seen.add(docId)
      return true
    })
    .slice(0, limit)

  // Get full details from Supabase
  const supabase = await createClient()
  const docIds = filtered.map((r) => r.metadata?.documentId)
  
  const { data: docs } = await supabase
    .from('documents')
    .select('id, slug, title, description')
    .in('id', docIds)

  const docMap = new Map(docs?.map((d) => [d.id, d]))

  return filtered.map((r) => {
    const doc = docMap.get(r.metadata?.documentId as string)
    return {
      id: r.metadata?.documentId as string,
      slug: r.metadata?.slug as string,
      title: r.metadata?.title as string,
      description: doc?.description || '',
      content: r.metadata?.content as string,
      score: r.score,
      highlights: extractHighlights(r.metadata?.content as string, query),
    }
  })
}

function extractHighlights(content: string, query: string): string[] {
  const terms = query.toLowerCase().split(/\s+/)
  const sentences = content.split(/[.!?]+/)
  
  return sentences
    .filter((s) => terms.some((t) => s.toLowerCase().includes(t)))
    .slice(0, 2)
    .map((s) => s.trim())
}
\`\`\`

## Search API Route

\`\`\`typescript
// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { searchDocuments } from '@/lib/ai/search'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10')

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: 'Query must be at least 2 characters' },
      { status: 400 }
    )
  }

  const results = await searchDocuments(query, limit)
  return NextResponse.json({ results, query, total: results.length })
}
\`\`\`

## Next Step

→ [Phase 6: AI Chat Integration](./06-ai-chat.md)
