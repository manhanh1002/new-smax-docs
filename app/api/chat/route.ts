// app/api/chat/route.ts
// RAG Chat API endpoint with streaming response

import { NextRequest, NextResponse } from 'next/server'
import { generateEmbedding } from '@/lib/embeddings'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { corsHeaders } from '@/lib/cors'
import OpenAI from 'openai'

// Initialize OpenAI client for Token.ai
const client = new OpenAI({
  apiKey: process.env.TOKEN_AI_API_KEY || 'dummy',
  baseURL: process.env.TOKEN_AI_BASE_URL || 'https://token.ai.vn/v1',
  defaultHeaders: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://docs.cdp.vn',
    'Referer': 'https://docs.cdp.vn/'
  }
})

// System prompt for RAG
const RAG_SYSTEM_PROMPT = `
# Role:
Bạn là "Chuyên gia hỗ trợ SmaxAI" - một trợ lý thông minh, tận tâm và chuyên nghiệp. Nhiệm vụ của bạn là đồng hành cùng khách hàng trong hành trình xây dựng hệ thống kinh doanh tự động trên nền tảng SmaxAI.

# Tone of Voice:
- Thân thiện, chuyên nghiệp, sử dụng ngôn ngữ tự nhiên của người Việt.
- Tuyệt đối không trả lời cụt lủn. Nếu tính năng không hỗ trợ, hãy giải thích nhẹ nhàng và đưa ra giải pháp thay thế.

# Quy trình xử lý (Thinking Step):
1. PHÂN TÍCH: Đọc kỹ câu hỏi của người dùng và tìm dữ liệu trong [CONTEXT].
2. SUY LUẬN: Nếu thông tin không có sẵn, hãy tìm xem có thông tin nào "gần giống" hoặc "liên quan" để hướng dẫn khách không.
3. Suy nghĩ kỹ trước khi trả lời, đảm bảo câu trả lời đầy đủ, chính xác và dễ hiểu cho người mới bắt đầu.
4. PHẢN HỒI: Trình bày câu trả lời theo cấu trúc: Chào hỏi (nếu là câu đầu) -> Trả lời trực tiếp -> Hướng dẫn chi tiết -> Link tài liệu (nếu có).

# Rules & Constraints:
- Chỉ sử dụng thông tin từ [CONTEXT]. Nếu không có, hãy khéo léo nói: "Dạ, hiện tại tài liệu của SmaxAI chưa cập nhật chi tiết về phần này, bạn có thể liên hệ support trực tiếp để được hỗ trợ kỹ hơn nhé!"
- Định dạng Markdown: In đậm **từ khóa quan trọng**, sử dụng list (-) cho các bước hướng dẫn.
- Luôn ưu tiên sự rõ ràng, dễ hiểu cho người mới bắt đầu.
- **QUAN TRỌNG VỀ HÌNH ẢNH:**
  - Nếu trong [CONTEXT] có chứa hình ảnh (định dạng image markdown), HÃY CHỈ SỬ DỤNG ẢNH KHI NÓ THỰC SỰ LIÊN QUAN ĐẾN BƯỚC ĐANG MÔ TẢ.
  - KHÔNG lặp lại cùng một ảnh nhiều lần.
  - Nếu không chắc chắn ảnh đó minh họa cho điều gì, ĐỪNG đưa vào.
  - Giữ nguyên định dạng markdown ảnh từ context, không tự ý thay đổi URL.

# URL Citation Rules:
- KHI CÓ THÔNG TIN TỪ TÀI LIỆU: Luôn trích dẫn URL chính xác từ [CONTEXT]
- URL PHẢI LÀ: /tai-lieu/[lang]/[slug] (không dùng smax.ai hoặc các domain khác)
- Thay thế các domain cũ (smax.ai, max.ai) bằng docs.cdp.vn/tai-lieu/ nếu cần thiết.

# Output Format:
- Tiêu đề ngắn (nếu cần).
- Nội dung trả lời chính (chia đoạn rõ ràng).
- 🔗 Tài liệu tham khảo: [Tên tài liệu](/tai-lieu/[lang]/[slug])
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
  url?: string
  document_path?: string // from RPC
  document_title?: string // from RPC
}

// Search for relevant documents using vector similarity
async function searchRelevantDocuments(
  queryEmbedding: number[],
  lang: string,
  matchThreshold: number = 0.3,
  matchCount: number = 5
): Promise<SearchResult[]> {
  try {
    const { data, error } = await supabaseAdmin.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
      filter_lang: lang
    })

    if (error) {
      console.error('Error searching documents:', error)
      return []
    }

    // The RPC 'match_documents' returns 'document_path' and 'document_title' from the joined 'documents' table.
    // We rely solely on Supabase data as requested.
    
    const searchResults = (data || []) as SearchResult[]
    
    // Map RPC result fields to expected SearchResult fields
    return searchResults.map(result => ({
        ...result,
        title: result.document_title || result.title || 'Untitled',
        url: result.document_path || result.url
    }))
  } catch (error) {
    console.error('Error in searchRelevantDocuments:', error)
    return []
  }
}

// Helper to strip Outline ID suffix from urlId (keep numbering)
function cleanSlug(urlId: string): string {
  if (!urlId) return ''
  let clean = urlId.replace(/^(vi|en)\//, '')
  // If it starts with /doc/ remove it (Outline URL format: /doc/slug-ID)
  clean = clean.replace(/^\/?doc\//, '')
  
  const match = clean.match(/^(.+)-([a-zA-Z0-9]{8,12})$/)
  if (match) return match[1]
  return clean
}

// Build context from search results
function buildContext(results: SearchResult[], lang: string): string {
  if (results.length === 0) {
    return 'Không có thông tin liên quan trong cơ sở dữ liệu.'
  }

  const contextParts = results.map((result, index) => {
    // Generate slug from the actual URL if available
    let slug = ''
    if (result.url) {
        const parts = result.url.split('/')
        slug = cleanSlug(parts[parts.length - 1])
    } else {
        // Fallback to title based slug if url is missing
        const title = result.title || ''
        slug = title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
    }
    
    // Replace relative image URLs with proxied absolute URLs
    // Assuming the app is deployed on Netlify or similar
    // We use the proxy route we created: /api/attachments.redirect?id=...
    // The content has ![](/api/attachments.redirect?id=...)
    // We want to keep it relative if the frontend can handle it, BUT the AI might hallucinate absolute URLs.
    // To be safe, let's make them absolute to the current domain if possible, or leave them relative.
    // However, the AI might output `https://api.attachments.redirect...` which is wrong.
    // Let's replace `/api/attachments.redirect` with `https://docs-smax.netlify.app/api/attachments.redirect`
    // Or better, use a variable for the domain.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://docs-smax.netlify.app'
    const contentWithImages = result.content.replace(
        /(\/api\/attachments\.redirect\?id=[a-zA-Z0-9-]+)/g,
        `${appUrl}$1`
    )

    return `[Tài liệu ${index + 1}: ${result.title}] (Link tham khảo: /tai-lieu/${lang}/${slug})\n${contentWithImages}`
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

    // Step 2: Search for relevant documents
    const queryEmbedding = await generateEmbedding(query)
    const searchResults = await searchRelevantDocuments(queryEmbedding, lang as string)
    console.log(`[Chat] Found ${searchResults.length} relevant documents`)

    // Step 3: Build context from search results
    const context = buildContext(searchResults, lang as string)

    // Step 4: Stream text using OpenAI SDK directly
    const model = process.env.CHAT_MODEL || 'gpt-4o-mini'
    
    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: `${RAG_SYSTEM_PROMPT}\n\nCONTEXT:\n${context}` },
      // Filter out invalid history messages
      ...history.filter(m => m.role && m.content).map(m => ({ 
        role: m.role as 'user' | 'assistant', 
        content: m.content 
      })),
      { role: 'user', content: query }
    ]

    try {
      const stream = await client.chat.completions.create({
        model: model,
        messages: messages as any,
        stream: true,
        temperature: 0.3,
        max_tokens: 1000,
      })

      // Convert OpenAI stream to standard ReadableStream
      const encoder = new TextEncoder()
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || ''
              if (content) {
                controller.enqueue(encoder.encode(content))
              }
            }
            controller.close()
          } catch (err) {
            console.error('Stream error:', err)
            controller.error(err)
          }
        },
      })

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          ...corsHeaders(origin),
        }
      })
    } catch (apiError: any) {
      console.error('[Chat] OpenAI API Error:', apiError)
      return new Response(JSON.stringify({ 
        error: 'OpenAI API Error', 
        message: apiError.message 
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders(origin)
        }
      })
    }

  } catch (error) {
    console.error('[Chat] Error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders(origin)
      }
    })
  }
}