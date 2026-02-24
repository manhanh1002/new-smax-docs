# Phase 6: AI Chat Integration

## RAG Chat Service

\`\`\`typescript
// lib/ai/chat.ts
import { streamText } from 'ai'
import { searchDocuments } from '@/lib/ai/search'

const SYSTEM_PROMPT = `You are a documentation assistant. Answer questions based on the provided context.
- Be concise but thorough
- Use markdown formatting
- Provide code examples when relevant
- If you can't find the answer, say so honestly`

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function chat(messages: ChatMessage[]) {
  const lastQuestion = messages.filter((m) => m.role === 'user').pop()?.content || ''
  
  // Retrieve relevant context
  const results = await searchDocuments(lastQuestion, 5, 0.6)
  
  const context = results
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: /docs/${r.slug}\n${r.content}`)
    .join('\n\n---\n\n')

  return streamText({
    model: 'openai/gpt-4o-mini',
    messages: [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\nContext:\n${context}` },
      ...messages,
    ],
    temperature: 0.7,
    maxTokens: 1000,
  })
}
\`\`\`

## Chat API Route

\`\`\`typescript
// app/api/chat/route.ts
import { NextRequest } from 'next/server'
import { chat, ChatMessage } from '@/lib/ai/chat'

export async function POST(request: NextRequest) {
  const { messages }: { messages: ChatMessage[] } = await request.json()
  
  if (!messages?.length) {
    return new Response(JSON.stringify({ error: 'Messages required' }), {
      status: 400,
    })
  }

  const result = await chat(messages)
  return result.toUIMessageStreamResponse()
}
\`\`\`

## Next Step

→ [Phase 7: UI Components](./07-ui-integration.md)
