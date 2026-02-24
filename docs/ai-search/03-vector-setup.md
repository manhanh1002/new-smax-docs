# Phase 3: Upstash Vector Setup

## Create Vector Index

1. Go to [console.upstash.com](https://console.upstash.com)
2. Navigate to **Vector Database**
3. Click **Create Index** with these settings:
   - **Name**: `docs-embeddings`
   - **Region**: Choose closest to your users
   - **Dimensions**: `1536` (OpenAI text-embedding-3-small)
   - **Similarity Metric**: `cosine`

## Vector Client

\`\`\`typescript
// lib/vector/client.ts
import { Index } from '@upstash/vector'

let client: Index | null = null

export function getVectorClient(): Index {
  if (!client) {
    client = new Index({
      url: process.env.UPSTASH_VECTOR_REST_URL!,
      token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
    })
  }
  return client
}

export interface VectorMetadata {
  documentId: string
  chunkId: string
  slug: string
  title: string
  content: string
  chunkIndex: number
}

export interface SearchResult {
  id: string
  score: number
  metadata: VectorMetadata
}
\`\`\`

## Embedding Utility

\`\`\`typescript
// lib/ai/embeddings.ts
import { embed, embedMany } from 'ai'

const MODEL = 'openai/text-embedding-3-small'

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({ model: MODEL, value: text })
  return embedding
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({ model: MODEL, values: texts })
  return embeddings
}
\`\`\`

## Next Step

→ [Phase 4: Content Ingestion](./04-ingestion.md)
