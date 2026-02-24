// app/api/chat/route.ts
// RAG Chat API endpoint with streaming response

import { NextRequest, NextResponse } from 'next/server'
import { generateEmbedding, generateChatCompletion, EMBEDDING_DIMENSION } from '@/lib/embeddings'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { corsHeaders } from '@/lib/cors'

// System prompt for RAG
const RAG_SYSTEM_PROMPT = `
# Role:
Bạn là "Chuyên gia hỗ trợ SmaxAI" - một trợ lý thông minh, tận tâm và chuyên nghiệp. Nhiệm vụ của bạn là đồng hành cùng khách hàng trong hành trình xây dựng hệ thống kinh doanh tự động trên nền tảng SmaxAI.

# Tone of Voice:
- Thân thiện, chuyên nghiệp, sử dụng ngôn ngữ tự nhiên của người Việt (Ví dụ: "Dạ, hiện tại...", "Rất tiếc là...", "SmaxAI có giải pháp này cho bạn...").
- Tuyệt đối không trả lời cụt lủn "Không" hoặc "Có". Nếu tính năng không hỗ trợ, hãy giải thích nhẹ nhàng và đưa ra giải pháp thay thế.

# Quy trình xử lý (Thinking Step):
1. PHÂN TÍCH: Đọc kỹ câu hỏi của người dùng và tìm dữ liệu trong [CONTEXT].
2. SUY LUẬN: Nếu thông tin không có sẵn, hãy tìm xem có thông tin nào "gần giống" hoặc "liên quan" để hướng dẫn khách không.
3. PHẢN HỒI: Trình bày câu trả lời theo cấu trúc: Chào hỏi (nếu là câu đầu) -> Trả lời trực tiếp -> Hướng dẫn chi tiết -> Link tài liệu (nếu có).

# Rules & Constraints:
- Chỉ sử dụng thông tin từ [CONTEXT]. Nếu không có, hãy khéo léo nói: "Dạ, hiện tại tài liệu của SmaxAI chưa cập nhật chi tiết về phần này, bạn có thể liên hệ support trực tiếp để được hỗ trợ kỹ hơn nhé!"
- Định dạng Markdown: In đậm **từ khóa quan trọng**, sử dụng list (-) cho các bước hướng dẫn.
- Luôn ưu tiên sự rõ ràng, dễ hiểu cho người mới bắt đầu (newbie).
- Nếu khách hỏi về lỗi, hãy thể hiện sự đồng cảm trước khi đưa ra giải pháp.

# Output Format:
- Tiêu đề ngắn (nếu cần).
- Nội dung trả lời chính (chia đoạn rõ ràng).
- 🔗 Tài liệu tham khảo: [Link ở đây]
`

interface ChatRequest {
  query: string
  lang?: 'vi' | 'en'
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
}

interface SearchResult {
  id: string
  title: string
  content: string
  similarity: number
  language: string
}

// Search for relevant documents using vector similarity
async function searchRelevantDocuments(
  queryEmbedding: number[],
  lang: string,
  matchThreshold: number = 0.3,
  matchCount: number = 5
): Promise<SearchResult[]> {
  try {
    const { data, error } = await supabaseAdmin.rpc('search_documents', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
      filter_lang: lang
    })

    if (error) {
      console.error('Error searching documents:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in searchRelevantDocuments:', error)
    return []
  }
}

// Build context from search results
function buildContext(results: SearchResult[]): string {
  if (results.length === 0) {
    return 'Không có thông tin liên quan trong cơ sở dữ liệu.'
  }

  const contextParts = results.map((result, index) => {
    return `[Tài liệu ${index + 1}: ${result.title}]\n${result.content}`
  })

  return contextParts.join('\n\n---\n\n')
}

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin)
  })
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  
  try {
    const body: ChatRequest = await request.json()
    const { query, lang = 'vi', history = [] } = body

    if (!query || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`[Chat] Query: ${query}, Lang: ${lang}`)

    // Step 1: Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query)

    // Step 2: Search for relevant documents
    const searchResults = await searchRelevantDocuments(queryEmbedding, lang)
    console.log(`[Chat] Found ${searchResults.length} relevant documents`)

    // Step 3: Build context from search results
    const context = buildContext(searchResults)

    // Step 4: Prepare messages for Gemini
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: `${RAG_SYSTEM_PROMPT}\n\nCONTEXT:\n${context}`
      },
      // Add conversation history
      ...history.slice(-6), // Keep last 6 messages for context
      {
        role: 'user',
        content: query
      }
    ]

    // Step 5: Generate streaming response from Gemini
    const stream = await generateChatCompletion(messages, { stream: true }) as ReadableStream

    // Step 6: Return streaming response
    const encoder = new TextEncoder()
    
    // Transform the stream to SSE format
    const transformedStream = new ReadableStream({
      async start(controller) {
        const reader = stream.getReader()
        
        try {
          while (true) {
            const { done, value } = await reader.read()
            
            if (done) {
              // Send done signal
              controller.enqueue(encoder.encode('[DONE]'))
              controller.close()
              break
            }

            // Send the chunk
            controller.enqueue(value)
          }
        } catch (error) {
          console.error('Stream error:', error)
          controller.error(error)
        }
      }
    })

    return new Response(transformedStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })

  } catch (error) {
    console.error('[Chat] Error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}