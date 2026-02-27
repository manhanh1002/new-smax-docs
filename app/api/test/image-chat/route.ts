// app/api/test/image-chat/route.ts
// Test API for RAG chat with image descriptions

import { NextRequest, NextResponse } from 'next/server'
import { generateEmbedding, generateChatCompletion } from '@/lib/embeddings'
import { supabaseAdmin } from '@/lib/supabase-admin'

// System prompt for testing
const TEST_SYSTEM_PROMPT = `
# Role:
Bạn là "Chuyên gia hỗ trợ SmaxAI" - một trợ lý thông minh, tận tâm và chuyên nghiệp. Nhiệm vụ của bạn là đồng hành cùng khách hàng trong hành trình xây dựng hệ thống kinh doanh tự động trên nền tảng SmaxAI.

# Tone of Voice:
- Thân thiện, chuyên nghiệp, sử dụng ngôn ngữ tự nhiên của người Việt.
- Trả lời chi tiết, có dẫn chứng cụ thể từ tài liệu.

# Rules:
- Sử dụng thông tin từ [CONTEXT] để trả lời.
- Nếu context có mô tả ảnh, hãy sử dụng thông tin đó để trả lời chi tiết hơn.
- Định dạng Markdown: In đậm **từ khóa quan trọng**, sử dụng list (-) cho các bước hướng dẫn.
`

interface TestChatRequest {
  query: string
  documentTitle?: string
  lang?: 'vi' | 'en'
}

// Search for relevant documents
async function searchDocuments(
  queryEmbedding: number[],
  documentTitle?: string,
  matchThreshold: number = 0.3,
  matchCount: number = 3
) {
  let query = supabaseAdmin
    .from('documents')
    .select('id, title, content, meta')
    .not('embedding', 'is', null)

  // Filter by document title if provided
  if (documentTitle) {
    query = query.ilike('title', `%${documentTitle}%`)
  }

  const { data: documents, error } = await query.limit(10)

  if (error || !documents || documents.length === 0) {
    return []
  }

  // For each document, calculate similarity (simplified - in production use RPC)
  // We'll just return the documents for now since we filtered by title
  return documents.map(doc => ({
    ...doc,
    similarity: 1 // Placeholder
  }))
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('query')
  const documentTitle = searchParams.get('title') || 'facebook'
  const lang = searchParams.get('lang') || 'vi'

  if (!query) {
    return NextResponse.json({
      error: 'Query parameter is required',
      usage: '?query=your_question&title=document_title'
    }, { status: 400 })
  }

  try {
    console.log(`[Test Image Chat] Query: "${query}"`)
    console.log(`[Test Image Chat] Document filter: "${documentTitle}"`)

    const startTime = Date.now()

    // Step 1: Generate embedding for query
    const queryEmbedding = await generateEmbedding(query)

    // Step 2: Search for relevant documents
    const documents = await searchDocuments(queryEmbedding, documentTitle)

    if (documents.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No documents found. Please run image-description API first with save=true.',
        query,
        suggestion: `GET /api/test/image-description?title=${documentTitle}&save=true`
      })
    }

    // Step 3: Build context from documents
    const contextParts = documents.map((doc, index) => {
      const imageDescriptions = doc.meta?.image_descriptions || []
      const hasImageDescriptions = imageDescriptions.length > 0

      return `[Tài liệu ${index + 1}: ${doc.title}]
${hasImageDescriptions ? `⚠️ Document này có ${imageDescriptions.length} mô tả ảnh` : ''}
${doc.content?.substring(0, 3000) || 'No content'}`
    })

    const context = contextParts.join('\n\n---\n\n')

    // Check if context contains image descriptions
    const hasImageDescriptions = context.includes('📷 **Mô tả ảnh**')
    const imageDescriptionCount = (context.match(/📷 \*\*Mô tả ảnh\*\*/g) || []).length

    console.log(`[Test Image Chat] Found ${documents.length} documents, ${imageDescriptionCount} image descriptions`)

    // Step 4: Generate response
    const messages = [
      {
        role: 'system' as const,
        content: `${TEST_SYSTEM_PROMPT}\n\nCONTEXT:\n${context}`
      },
      {
        role: 'user' as const,
        content: query
      }
    ]

    const answer = await generateChatCompletion(messages, { stream: false }) as string

    const processingTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      query,
      documentFilter: documentTitle,
      answer,
      contextInfo: {
        documentsFound: documents.length,
        documentTitles: documents.map(d => d.title),
        hasImageDescriptions,
        imageDescriptionCount
      },
      processingTime,
      // Include context for debugging (truncated)
      contextPreview: context.substring(0, 1000) + '...'
    })

  } catch (error) {
    console.error('[Test Image Chat] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body: TestChatRequest = await request.json()
  const { query, documentTitle, lang = 'vi' } = body

  if (!query) {
    return NextResponse.json({
      error: 'query is required'
    }, { status: 400 })
  }

  try {
    console.log(`[Test Image Chat POST] Query: "${query}"`)

    const startTime = Date.now()

    // Generate embedding
    const queryEmbedding = await generateEmbedding(query)

    // Search documents
    const documents = await searchDocuments(queryEmbedding, documentTitle)

    if (documents.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No documents found. Run image-description API first.',
        query
      })
    }

    // Build context
    const context = documents.map(doc => 
      `[${doc.title}]\n${doc.content?.substring(0, 3000) || 'No content'}`
    ).join('\n\n---\n\n')

    // Check for image descriptions
    const hasImageDescriptions = context.includes('📷 **Mô tả ảnh**')

    // Generate answer
    const messages = [
      {
        role: 'system' as const,
        content: `${TEST_SYSTEM_PROMPT}\n\nCONTEXT:\n${context}`
      },
      {
        role: 'user' as const,
        content: query
      }
    ]

    const answer = await generateChatCompletion(messages, { stream: false }) as string

    return NextResponse.json({
      success: true,
      query,
      answer,
      metadata: {
        documentsFound: documents.length,
        hasImageDescriptions,
        processingTime: Date.now() - startTime
      }
    })

  } catch (error) {
    console.error('[Test Image Chat] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}