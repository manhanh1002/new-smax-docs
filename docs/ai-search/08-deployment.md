# Phase 8: Deployment

## Environment Variables Checklist

Ensure all variables are set in Vercel Dashboard → Settings → Environment Variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `UPSTASH_VECTOR_REST_URL` | Upstash Vector REST URL |
| `UPSTASH_VECTOR_REST_TOKEN` | Upstash Vector REST token |
| `INGEST_SECRET_KEY` | Secret for ingestion API |
| `NEXT_PUBLIC_APP_URL` | Your deployed app URL |

## Deployment Steps

1. **Deploy to Vercel**
   \`\`\`bash
   vercel deploy --prod
   \`\`\`

2. **Run database migrations**
   - Go to Supabase SQL Editor
   - Execute scripts from Phase 2

3. **Ingest documentation**
   \`\`\`bash
   curl -X POST https://your-app.vercel.app/api/ingest \
     -H "Authorization: Bearer YOUR_INGEST_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"slug":"quickstart","title":"Quickstart","content":"..."}'
   \`\`\`

4. **Test search**
   - Open your app
   - Press Cmd+K and search
   - Verify AI results appear

## Continuous Ingestion

Set up a webhook to re-ingest when docs change:

\`\`\`typescript
// app/api/webhook/docs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { pages } from '@/lib/docs/pages'

export async function POST(request: NextRequest) {
  const documents = Object.entries(pages).map(([slug, page]) => ({
    slug,
    title: page.title,
    content: page.content,
  }))

  // Ingest all documents
  for (const doc of documents) {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ingest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.INGEST_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(doc),
    })
  }

  return NextResponse.json({ success: true })
}
\`\`\`

## Analytics Queries

Monitor search quality with these SQL queries:

\`\`\`sql
-- Top searches (last 7 days)
SELECT query, COUNT(*) as count
FROM search_analytics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY query
ORDER BY count DESC
LIMIT 20;

-- Zero-result searches
SELECT query, COUNT(*) as count
FROM search_analytics
WHERE results_count = 0
GROUP BY query
ORDER BY count DESC;
\`\`\`

## Summary

Your AI-powered documentation search is now live with:
- Semantic search using vector embeddings
- RAG-based AI chat assistant
- Search analytics tracking
- Automatic content syncing
\`\`\`

\`\`\`md file="docs/AI_SEARCH_IMPLEMENTATION.md" isDeleted="true"
...deleted...
