// app/api/chat/route.ts
// RAG Chat API endpoint with streaming response
// IMPROVED: Query Analysis + Multi-Query Search + Intent Classification

import { NextRequest, NextResponse } from 'next/server'
import { generateEmbedding } from '@/lib/embeddings'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { corsHeaders, ALLOWED_ORIGINS } from '@/lib/cors'
import OpenAI from 'openai'
import {
  analyzeQuery,
  getIntentPrompt,
  QueryAnalysis,
  QueryIntent
} from '@/lib/query-analysis'
import { enhancedSearch } from '@/lib/enhanced-search'

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

# 🔄 CHAIN-OF-THOUGHT (Hiển thị quá trình suy nghĩ):
Với các câu hỏi, HÃY hiển thị quá trình suy nghĩ theo format sau:

[THINKING]
- Phân tích: [user hỏi gì, cần thông tin gì]
- Đánh giá: [tài liệu nào liên quan, thông tin có đủ không]
- Suy luận: [cách kết hợp thông tin từ các nguồn]
[/THINKING]

[ANSWER]
[câu trả lời cuối cùng - chỉ phần này hiển thị mặc định]
[/ANSWER]
- Không được có chữ "ANSWER" khi trả lời nhé
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
- URL PHẢI LÀ: /[lang]/[slug] (không dùng smax.ai hoặc các domain khác)
- Thay thế các domain cũ (smax.ai, max.ai) bằng docs.cdp.vn/ nếu cần thiết.

# Output Format:
- Tiêu đề ngắn (nếu cần).
- Nội dung trả lời chính (chia đoạn rõ ràng).
- 🔗 Tài liệu tham khảo: [Tên tài liệu](/[lang]/[slug])

---

## ⚠️ QUAN TRỌNG: XỬ LÝ LỊCH SỬ HỘI THOẠI (CONVERSATION HISTORY)

### 1. Đọc Kỹ Lịch Sử Trước Khi Trả Lời:
- LUÔN kiểm tra [CONVERSATION_HISTORY] để hiểu ngữ cảnh câu chuyện.
- Nếu user hỏi tiếp về nội dung đã được giải thích → KHÔNG lặp lại toàn bộ hướng dẫn cũ.
- Thay vào đó: "Như mình đã hướng dẫn ở trên..." → Chỉ bổ sung phần còn thiếu hoặc làm rõ.

### 2. Phát Hiện Câu Hỏi Nối Tiếp:
- Nếu user dùng từ như: "còn", "thêm", "tiếp theo", "và phần kia", "cái đó là gì" → Đây là follow-up question.
- Trả về thông tin MỚI, không lặp lại thông tin đã cung cấp.

### 3. Ví Dụ Xử Lý:
❌ SAI (lặp lại):
User: "Cách kết nối Zalo OA?"
AI: Hướng dẫn đầy đủ 5 bước...
User: "Còn Telegram thì sao?"
AI: Để kết nối Zalo OA bạn làm như sau... [LẶP LẠI]

✅ ĐÚNG (không lặp):
User: "Cách kết nối Zalo OA?"
AI: Hướng dẫn đầy đủ 5 bước...
User: "Còn Telegram thì sao?"
AI: "Đối với Telegram, quy trình tương tự nhưng khác ở bước xác thực..." [CHỈ BỔ SUNG]

---

## ⚠️ QUAN TRỌNG: CÂU HỎI PHỨC TẠP - TRẢ LỜI NGẮN GỌN + LINK

### Khi Nào Cần Trả Lời Ngắn Gọn:
- Câu hỏi yêu cầu NHIỀU bước hướng dẫn (> 5 bước)
- Câu hỏi có NHIỀU khái niệm cần giải thích
- Câu hỏi so sánh nhiều tính năng

### Cách Trả Lời:
1. **Tóm tắt ngắn gọn** (2-3 câu) về câu trả lời
2. **Đưa link bài viết chi tiết** ngay sau đó
3. **Hỏi user** có muốn mình giải thích thêm phần nào không

### Ví Dụ:
❌ SAI (quá dài):
"Dưới đây là hướng dẫn chi tiết 15 bước để thiết lập hệ thống bot auto đa kênh từ đầu đến cuối..." [2000 từ]

✅ ĐÚNG (ngắn gọn + link):
"Thiết lập bot auto đa kênh gồm 3 giai đoạn chính:
1. **Kết nối các kênh** (Zalo, Facebook, Telegram...)
2. **Tạo kịch bản bot** cho từng kênh
3. **Thiết lập trigger** và điều kiện

📘 **Hướng dẫn chi tiết từng bước:**
- [Cài đặt Bot Auto](/vi/cai-dat-bot-auto)
- [Kết nối đa kênh](/vi/ket-noi-da-kenh)

Bạn muốn mình đi sâu vào phần nào?"
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
  language?: string
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

// IMPROVED: Multi-query search for complex questions
// Searches with multiple queries and merges/dedupes results
async function multiQuerySearch(
  subQueries: string[],
  lang: string,
  matchThreshold: number,
  matchCount: number
): Promise<SearchResult[]> {
  console.log(`[MultiQuery] Searching ${subQueries.length} sub-queries...`)
  
  const allResults: SearchResult[] = []
  const seenIds = new Set<string>()
  
  // Process each sub-query
  for (const subQuery of subQueries) {
    try {
      const embedding = await generateEmbedding(subQuery)
      const results = await searchRelevantDocuments(embedding, lang, matchThreshold, matchCount)
      
      // Add unique results
      for (const result of results) {
        if (!seenIds.has(result.id)) {
          seenIds.add(result.id)
          allResults.push(result)
        }
      }
      
      // Small delay to avoid rate limiting
      if (subQueries.indexOf(subQuery) < subQueries.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    } catch (error) {
      console.error(`[MultiQuery] Error searching sub-query "${subQuery}":`, error)
    }
  }
  
  // Sort by similarity (descending)
  allResults.sort((a, b) => b.similarity - a.similarity)
  
  // Limit total results
  const maxResults = matchCount * 2 // Allow more results for complex queries
  const limitedResults = allResults.slice(0, maxResults)
  
  console.log(`[MultiQuery] Found ${limitedResults.length} unique results from ${subQueries.length} queries`)
  
  return limitedResults
}

// IMPROVED: Enhanced context building with deduplication
function buildEnhancedContext(results: SearchResult[], lang: string, intent: QueryIntent): string {
  if (results.length === 0) {
    return 'Không có thông tin liên quan trong cơ sở dữ liệu.'
  }

  // Group results by document for better organization
  const docGroups = new Map<string, SearchResult[]>()
  
  for (const result of results) {
    const docTitle = result.title || 'Unknown'
    if (!docGroups.has(docTitle)) {
      docGroups.set(docTitle, [])
    }
    docGroups.get(docTitle)!.push(result)
  }

  const contextParts: string[] = []
  let docIndex = 0
  
  for (const [docTitle, chunks] of docGroups) {
    docIndex++
    
    // Generate slug from the first chunk's URL
    let slug = ''
    const firstChunk = chunks[0]
    if (firstChunk.url) {
      const parts = firstChunk.url.split('/')
      slug = cleanSlug(parts[parts.length - 1])
    } else {
      slug = docTitle
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    }
    
    // Combine content from all chunks of this document
    const combinedContent = chunks
      .map(c => c.content)
      .join('\n\n')
    
    // Replace image URLs
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://docs-smax.netlify.app'
    const contentWithImages = combinedContent.replace(
      /(\/api\/attachments\.redirect\?id=[a-zA-Z0-9-]+)/g,
      `${appUrl}$1`
    )

    // Format based on intent
    if (intent === 'comparison') {
      contextParts.push(`📄 **${docTitle}** (Link: /${lang}/${slug})\n${contentWithImages}`)
    } else {
      contextParts.push(`[Tài liệu ${docIndex}: ${docTitle}] (Link: /${lang}/${slug})\n${contentWithImages}`)
    }
  }

  return contextParts.join('\n\n---\n\n')
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

    return `[Tài liệu ${index + 1}: ${result.title}] (Link tham khảo: /${lang}/${slug})\n${contentWithImages}`
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

const SYSTEM_KEY_ID = '00000000-0000-0000-0000-000000000000'

async function verifyAccess(req: NextRequest) {
  const origin = req.headers.get('origin')
  const apiKeyHeader = req.headers.get('x-api-key')

  // 1. If it's a browser request from an allowed origin, bypass key check (CORS already handles security)
  if (origin && (
    ALLOWED_ORIGINS.includes(origin) || 
    origin.endsWith('.smax.ai') || 
    origin.endsWith('.cdp.vn')
  )) {
    return true
  }

  // 2. Otherwise, require x-api-key (e.g. Curl, Postman, unauthorized origin)
  if (!apiKeyHeader) return false

  // Fetch the current key from Supabase (system record)
  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('content')
    .eq('id', SYSTEM_KEY_ID)
    .single()

  if (error || !data) return false
  return apiKeyHeader === data.content
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  
  // Verify access (either via allowed origin or API Key)
  const isAuthorized = await verifyAccess(request)
  if (!isAuthorized) {
    return new Response(JSON.stringify({ 
      error: 'Unauthorized. Use an allowed origin or provide a valid x-api-key header.' 
    }), {
      status: 401,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders(origin)
      }
    })
  }

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

    // ========== IMPROVED: Query Analysis with Normalization ==========
    const analysis = analyzeQuery(query)
    console.log(`[Chat] Analysis:`, {
      intent: analysis.intent,
      isComplex: analysis.isComplex,
      originalQuery: analysis.originalQuery,
      normalizedQuery: analysis.normalizedQuery,
      subQueries: analysis.subQueries,
      suggestedMatchCount: analysis.suggestedMatchCount,
      suggestedThreshold: analysis.suggestedThreshold
    })
    
    // Use normalized query for embedding generation (expands abbreviations)
    const queryForEmbedding = analysis.normalizedQuery
    console.log(`[Chat] Using normalized query for embedding: "${queryForEmbedding}"`)

    // Handle greeting intent specially
    if (analysis.intent === 'greeting') {
      const greetingResponse = generateGreetingResponse(lang)
      return new Response(greetingResponse, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          ...corsHeaders(origin),
        }
      })
    }

    // ========== HYBRID SEARCH ==========
    let searchResults: SearchResult[]

    // Try enhanced search first (hybrid search with query expansion + re-ranking)
    try {
      searchResults = await enhancedSearch(
        queryForEmbedding,
        lang,
        {
          expandVariants: true,
          useReranking: true,
          matchCount: 25,
          matchThreshold: 0.05,
        }
      )
    } catch (error) {
      console.error('[Chat] Enhanced search failed, using basic search:', error)
      // Fallback to basic vector search
      const queryEmbedding = await generateEmbedding(queryForEmbedding)
      searchResults = await searchRelevantDocuments(
        queryEmbedding,
        lang,
        analysis.suggestedThreshold,
        analysis.suggestedMatchCount
      )
    }

    // If still no results, try with lower threshold
    if (searchResults.length === 0) {
      try {
        const queryEmbedding = await generateEmbedding(queryForEmbedding)
        searchResults = await searchRelevantDocuments(
          queryEmbedding,
          lang,
          0.01,
          20
        )
      } catch (e) {
        console.error('[Chat] Fallback search also failed:', e)
        searchResults = []
      }
    }

    console.log(`[Chat] Found ${searchResults.length} relevant documents`)

    // ========== IMPROVED: Enhanced Context Building ==========
    const context = buildEnhancedContext(searchResults, lang, analysis.intent)

    // ========== IMPROVED: Intent-Specific System Prompt ==========
    const intentPrompt = getIntentPrompt(analysis.intent)
    
    // ========== IMPROVED: Build Conversation History Context ==========
    let historyContext = ''
    if (history && history.length > 0) {
      const formattedHistory = history
        .filter(m => m.role && m.content)
        .map(m => `${m.role === 'user' ? '👤 User' : '🤖 Assistant'}: ${m.content}`)
        .join('\n\n')
      
      historyContext = `
---

## [CONVERSATION_HISTORY]
Dưới đây là lịch sử hội thoại trước đó. HÃY ĐỌC KỸ để:
1. Không lặp lại hướng dẫn đã cung cấp
2. Hiểu context của câu hỏi nối tiếp
3. Chỉ bổ sung thông tin mới

${formattedHistory}

---
`
    }
    
    const fullSystemPrompt = `${RAG_SYSTEM_PROMPT}\n${intentPrompt}\n${historyContext}\nCONTEXT:\n${context}`

    // Step 4: Stream text using OpenAI SDK directly
    const model = process.env.CHAT_MODEL || 'gpt-4o-mini'
    
    // Prepare messages for OpenAI
    // Note: We include history in system prompt for better context understanding
    // The actual message history is kept minimal to avoid token limits
    const messages = [
      { role: 'system', content: fullSystemPrompt },
      // Only include recent history (last 4 messages) to avoid token limits
      ...history.filter(m => m.role && m.content).slice(-4).map(m => ({ 
        role: m.role as 'user' | 'assistant', 
        content: m.content 
      })),
      { role: 'user', content: query }
    ]
    
    console.log(`[Chat] History length: ${history?.length || 0}, Using last ${Math.min(history?.length || 0, 4)} messages`)

    try {
      const stream = await client.chat.completions.create({
        model: model,
        messages: messages as any,
        stream: true,
        temperature: 0.3,
        max_tokens: 1500, // Increased for complex answers
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

// Helper function for greeting responses
function generateGreetingResponse(lang: string): string {
  if (lang === 'en') {
    return `👋 Hello! I'm the SmaxAI Support Assistant.

I can help you with:
- **Features**: Questions about Zalo OA, Facebook Messenger, Telegram, etc.
- **Setup guides**: How to connect channels, configure bot auto, etc.
- **Troubleshooting**: Fix issues with integrations
- **Comparisons**: Help choose the right channel for your business

What would you like to know?`
  }
  
  return `👋 Xin chào! Tôi là Trợ lý Hỗ trợ SmaxAI.

Tôi có thể giúp bạn với:
- **Tính năng**: Câu hỏi về Zalo OA, Facebook Messenger, Telegram, v.v.
- **Hướng dẫn cài đặt**: Cách kết nối kênh, cấu hình bot auto, v.v.
- **Khắc phục sự cố**: Sửa lỗi tích hợp, kết nối
- **So sánh**: Giúp chọn kênh phù hợp cho doanh nghiệp của bạn

Bạn muốn biết điều gì?`
}
