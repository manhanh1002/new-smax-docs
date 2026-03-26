/**
 * Query Analysis Module for RAG Chat
 * 
 * Handles:
 * 1. Intent Classification - Detect user intent
 * 2. Query Decomposition - Split complex queries into sub-queries
 * 3. Query Expansion - Add related terms for better retrieval
 * 4. Query Normalization - Expand Vietnamese abbreviations
 */

// Intent types
export type QueryIntent = 
  | 'feature_inquiry'    // Hỏi về tính năng
  | 'how_to'             // Hướng dẫn
  | 'comparison'         // So sánh
  | 'troubleshooting'    // Khắc phục sự cố
  | 'greeting'           // Chào hỏi
  | 'off_topic'          // Ngoài phạm vi (chính trị, đời sống, v.v.)
  | 'general'            // Câu hỏi chung

export interface QueryAnalysis {
  intent: QueryIntent
  subQueries: string[]
  expandedTerms: string[]
  isComplex: boolean
  suggestedMatchCount: number
  suggestedThreshold: number
  originalQuery: string
  normalizedQuery: string
}

// ============================================
// VIETNAMESE ABBREVIATION DICTIONARY
// FIXED: Remove single-char abbreviations that break text
// ============================================
const VIETNAMESE_ABBREVIATIONS: Record<string, string> = {
  // Viết tắt phổ biến (tối thiểu 2 ký tự)
  'ko': 'không',
  'k': 'không',       // Keep this as 'k' is often used standalone
  'kh': 'không',
  'ntn': 'như thế nào',
  'kq': 'kết quả',
  'j': 'gì',
  'cj': 'cái gì',
  'bn': 'bao nhiêu',
  'lm': 'làm',
  'cx': 'cũng',
  'dc': 'được',
  'đc': 'được',
  'vs': 'với',
  'ms': 'mới',
  'tn': 'thế nào',
  'mk': 'mình',
  'mjnh': 'mình',
  'mjk': 'mình',
  'aj': 'ai',
  'đâj': 'đây',
  'z': 'vậy',
  'r': 'rồi',
  // REMOVED: Single char abbreviations that break text
  // 't': 'tao',  // BROKEN: Replaces every 't'
  // 'm': 'mày',  // BROKEN: Replaces every 'm'
  // 'b': 'bạn',  // BROKEN: Replaces every 'b'
  // 'a': 'anh',   // BROKEN: Replaces every 'a'
  // 'e': 'em',    // BROKEN: Replaces every 'e'
  // 'c': 'chị',  // BROKEN: Replaces every 'c'
  // 'ch': 'cho', // BROKEN: Replaces 'ch' in words like 'cho', 'chi'
  // 'h': 'giờ',  // BROKEN: Replaces every 'h'
  'hn': 'hôm nay',
  'hnay': 'hôm nay',
  'mai': 'ngày mai',
  'hqua': 'hôm qua',
  'tq': 'tổng quan',
  'cn': 'chức năng',
  'cg': 'có gì',
  'kg': 'không gì',
  'kt': 'kiểm tra',
  'ht': 'hướng dẫn',
  'th': 'thử',
  'tl': 'trả lời',
  'ns': 'nói',
  'cb': 'chuẩn bị',
  'sd': 'sử dụng',
  'sđt': 'số điện thoại',
}

// ============================================
// DOMAIN-SPECIFIC TERM MAPPINGS (SmaxAI)
// IMPROVED: Enhanced with more synonyms for better matching
// ============================================
const DOMAIN_TERM_MAPPINGS: Record<string, string[]> = {
  // AI & Bot
  'ai': ['GenAI', 'trí tuệ nhân tạo', 'artificial intelligence'],
  'bot': ['bot auto', 'chatbot', 'automation', 'tự động', 'trợ lý ảo'],
  'chatbot': ['bot auto', 'chatbot', 'automation', 'tự động', 'bot'],
  'automation': ['bot auto', 'tự động', 'chatbot'],

  // Zalo
  'zalo': ['Zalo OA', 'Zalo Official Account', 'zalo oa'],
  'oa': ['Official Account', 'Zalo OA', 'zalo oa'],
  'zalo oa': ['Zalo Official Account', 'Zalo OA'],
  'zalo user': ['Zalo User', 'zalo cá nhân'],

  // Facebook
  'fb': ['Facebook', 'Facebook Messenger', 'messenger'],
  'facebook': ['Facebook Messenger', 'Meta Messenger', 'messenger'],
  'messenger': ['Facebook Messenger', 'Meta Messenger'],

  // Other channels
  'tele': ['Telegram'],
  'telegram': ['Telegram'],
  'instagram': ['Instagram', 'IG'],
  'tiktok': ['TikTok', '抖音'],
  'whatsapp': ['WhatsApp', 'WA'],
  'livechat': ['Live Chat', 'trò chuyện trực tuyến', 'chat web'],
  'website': ['trang web', 'web'],

  // Smax
  'smax': ['SmaxAI', 'Smax', 'smax ai'],

  // Features
  'api': ['API', 'giao diện lập trình', 'lập trình'],
  'webhook': ['Webhook', 'kết nối API', 'webhook'],
  'broadcast': ['Broadcast', 'gửi tin nhắn hàng loạt', 'tin nhắn hàng loạt', 'mass message'],
  'segment': ['Segment', 'phân nhóm khách hàng', 'nhóm khách hàng'],
  'trigger': ['Trigger', 'kích hoạt tự động', 'điều kiện kích hoạt'],
  'template': ['Template', 'mẫu tin nhắn', 'tin nhắn mẫu'],
  'dashboard': ['Dashboard', 'bảng điều khiển', 'trang tổng quan'],

  // Additional
  'kết nối': ['tích hợp', 'cài đặt', 'thiết lập', 'setup', 'connect'],
  'gửi tin': ['tin nhắn', 'message', 'nhắn tin'],
  'khách hàng': ['customer', 'user', 'người dùng', 'client'],
}

// ============================================
// KEYWORDS FOR INTENT CLASSIFICATION
// ============================================
const INTENT_KEYWORDS: Record<QueryIntent, string[]> = {
  feature_inquiry: [
    'tính năng', 'chức năng', 'có gì', 'làm được gì', 'hỗ trợ gì',
    'feature', 'function', 'capabilities', 'what can'
  ],
  how_to: [
    'cách', 'hướng dẫn', 'làm thế nào', 'thiết lập', 'cài đặt', 'kết nối',
    'how to', 'how', 'setup', 'configure', 'install', 'connect', 'guide'
  ],
  comparison: [
    'so sánh', 'khác nhau', 'giống nhau', 'tốt hơn', 'nên chọn',
    'compare', 'difference', 'vs', 'versus', 'better', 'which one'
  ],
  troubleshooting: [
    'lỗi', 'không được', 'không thể', 'thất bại', 'sự cố', 'vấn đề', 'không hoạt động',
    'error', 'not working', 'failed', 'issue', 'problem', 'cannot', "can't"
  ],
  greeting: [
    'xin chào', 'hello', 'chào', 'hey', 'good morning', 'good afternoon',
    'hi there', 'hi all'
  ],
  off_topic: [
    // Chính trị & Tôn giáo
    'chính trị', 'đảng', 'nhà nước', 'chính phủ', 'bầu cử', 'tôn giáo', 'đạo', 'phật', 'chúa',
    'politics', 'government', 'religion', 'god', 'buddha',
    // Đời sống & Cá nhân
    'ăn gì', 'đi đâu', 'thời tiết', 'bóng đá', 'thể thao', 'người yêu', 'tình cảm', 'tâm sự',
    'thất tình', 'giàu nghèo', 'tiền bạc', 'vàng', 'chứng khoán', 'cổ phiếu',
    'weather', 'football', 'sports', 'love', 'money', 'stock', 'gold',
    // Kiến thức phổ thông không liên quan
    'thế giới', 'lịch sử', 'địa lý', 'toán học', 'vật lý', 'hóa học',
    'history', 'geography', 'math', 'physics', 'chemistry',
    // Câu hỏi triết học/vô định
    'ý nghĩa cuộc sống', 'tại sao', 'làm sao để hạnh phúc',
    'meaning of life', 'how to be happy'
  ],
  general: []
}

// Channel/feature keywords
const CHANNEL_KEYWORDS = [
  'zalo', 'facebook', 'messenger', 'telegram', 'instagram', 'tiktok', 
  'whatsapp', 'livechat', 'website', 'api'
]

const FEATURE_KEYWORDS = [
  'bot auto', 'broadcast', 'trigger', 'segment', 'khách hàng', 'dashboard',
  'thống kê', 'tin nhắn', 'template', 'webhook', 'integration'
]

// ============================================
// QUERY NORMALIZATION FUNCTION
// ============================================

/**
 * Normalize query by expanding abbreviations and domain terms
 */
export function normalizeQuery(query: string): string {
  let normalized = query.toLowerCase()
  
  // 1. Expand Vietnamese abbreviations (word boundary matching)
  for (const [abbr, full] of Object.entries(VIETNAMESE_ABBREVIATIONS)) {
    // Match word boundaries to avoid replacing parts of words
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi')
    normalized = normalized.replace(regex, full)
  }
  
  // 2. Expand domain-specific terms
  const expandedTerms: string[] = []
  for (const [term, expansions] of Object.entries(DOMAIN_TERM_MAPPINGS)) {
    if (normalized.includes(term)) {
      expandedTerms.push(...expansions)
    }
  }
  
  // Add expanded terms to query for better embedding matching
  if (expandedTerms.length > 0) {
    normalized = normalized + ' ' + [...new Set(expandedTerms)].join(' ')
  }
  
  return normalized
}

/**
 * Get original normalized query (without domain expansions, just abbreviation expansion)
 */
export function getDisplayNormalizedQuery(query: string): string {
  let normalized = query.toLowerCase()
  
  for (const [abbr, full] of Object.entries(VIETNAMESE_ABBREVIATIONS)) {
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi')
    normalized = normalized.replace(regex, full)
  }
  
  return normalized
}

// ============================================
// INTENT CLASSIFICATION
// ============================================

/**
 * Classify the intent of a user query
 */
export function classifyIntent(query: string): QueryIntent {
  const lowerQuery = query.toLowerCase()
  
  // Check greeting first
  for (const keyword of INTENT_KEYWORDS.greeting) {
    if (lowerQuery.includes(keyword)) {
      return 'greeting'
    }
  }
  
  // Check off-topic next (critical shield)
  for (const keyword of INTENT_KEYWORDS.off_topic) {
    if (lowerQuery.includes(keyword)) {
      return 'off_topic'
    }
  }

  // Check other intents
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (intent === 'greeting' || intent === 'off_topic' || intent === 'general') continue
    
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword)) {
        return intent as QueryIntent
      }
    }
  }
  
  // Final heuristic check: if not a greeting/intent and mentions NO software keywords, it might be off-topic
  const mentionsSoftware = [
    ...CHANNEL_KEYWORDS, 
    ...FEATURE_KEYWORDS, 
    'smax', 'bot', 'phần mềm', 'tài khoản', 'kết nối', 'cài đặt'
  ].some(kw => lowerQuery.includes(kw))

  if (!mentionsSoftware && lowerQuery.length > 20) {
    // Longer queries with no software keywords are likely off-topic
    // but we'll mark as general for now and let the prompt handle strictness
    // unless we are very sure.
    // For now, let's stick to explicit keyword off_topic to avoid false positives.
  }

  return 'general'
}

/**
 * Check if query is complex (contains multiple topics/questions)
 */
export function isComplexQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase()
  
  let score = 0
  
  // Check for connectors
  const connectors = [' và ', ' với ', ' hoặc ', ' cũng như ', ' và cả ', ' ngoài ra ', ' thêm ', ' cùng ']
  for (const connector of connectors) {
    if (lowerQuery.includes(connector)) {
      score++
    }
  }
  
  // Check for multiple channel mentions
  let channelCount = 0
  for (const channel of CHANNEL_KEYWORDS) {
    if (lowerQuery.includes(channel)) {
      channelCount++
    }
  }
  if (channelCount >= 2) score += 2
  
  // Check for multiple feature mentions
  let featureCount = 0
  for (const feature of FEATURE_KEYWORDS) {
    if (lowerQuery.includes(feature)) {
      featureCount++
    }
  }
  if (featureCount >= 2) score += 1
  
  // Check for comparison words
  if (lowerQuery.includes('so sánh') || lowerQuery.includes('khác nhau') || lowerQuery.includes('compare')) {
    score += 1
  }
  
  // Check for multiple action verbs
  const actionVerbs = ['cách', 'hướng dẫn', 'thiết lập', 'kết nối', 'cài đặt']
  let actionCount = 0
  for (const verb of actionVerbs) {
    if (lowerQuery.includes(verb)) {
      actionCount++
    }
  }
  if (actionCount >= 1 && score >= 1) {
    score += 1
  }
  
  return score >= 2
}

/**
 * Decompose complex query into sub-queries
 */
export function decomposeQuery(query: string): string[] {
  const subQueries: string[] = []
  const lowerQuery = query.toLowerCase()
  
  // Pattern: Comparison
  if (lowerQuery.includes('so sánh') || lowerQuery.includes('khác nhau')) {
    for (const channel of CHANNEL_KEYWORDS) {
      if (lowerQuery.includes(channel)) {
        subQueries.push(channel)
      }
    }
    if (subQueries.length >= 2) {
      subQueries.push(`so sánh ${subQueries.join(' và ')}`)
    }
  }
  
  // Pattern: "Cách X và Y"
  if (lowerQuery.includes('cách') || lowerQuery.includes('hướng dẫn')) {
    const parts = query.split(/\s+và\s+/i)
    if (parts.length > 1) {
      for (const part of parts) {
        subQueries.push(part.trim())
      }
    }
  }
  
  // Extract topics
  const topics = extractTopics(query)
  if (topics.length > 1) {
    for (const topic of topics) {
      subQueries.push(topic)
    }
  }
  
  const uniqueQueries = [...new Set(subQueries)].filter(q => q.length > 3)
  
  if (uniqueQueries.length === 0) {
    return [query]
  }
  
  return uniqueQueries
}

/**
 * Extract main topics from query
 */
function extractTopics(query: string): string[] {
  const topics: string[] = []
  const lowerQuery = query.toLowerCase()
  
  for (const channel of CHANNEL_KEYWORDS) {
    if (lowerQuery.includes(channel)) {
      topics.push(channel)
    }
  }
  
  for (const feature of FEATURE_KEYWORDS) {
    if (lowerQuery.includes(feature)) {
      topics.push(feature)
    }
  }
  
  return topics
}

/**
 * Expand query with related terms
 */
export function expandQuery(query: string): string[] {
  const expandedTerms: string[] = []
  const lowerQuery = query.toLowerCase()
  
  const synonyms: Record<string, string[]> = {
    'kết nối': ['tích hợp', 'cài đặt', 'setup', 'connect'],
    'tin nhắn': ['message', 'messenger', 'chat'],
    'khách hàng': ['customer', 'user', 'người dùng'],
    'bot': ['chatbot', 'auto bot', 'automation'],
    'broadcast': ['gửi tin', 'gửi tin nhắn hàng loạt', 'mass message'],
  }
  
  for (const [term, related] of Object.entries(synonyms)) {
    if (lowerQuery.includes(term)) {
      expandedTerms.push(...related)
    }
  }
  
  return [...new Set(expandedTerms)]
}

/**
 * Get suggested search parameters based on intent
 * IMPROVED: Lower thresholds and higher match counts for better retrieval
 */
export function getSearchParams(intent: QueryIntent, isComplex: boolean): {
  matchCount: number
  threshold: number
} {
  switch (intent) {
    case 'comparison':
      return { matchCount: isComplex ? 15 : 12, threshold: 0.1 }
    case 'how_to':
      return { matchCount: 12, threshold: 0.1 }
    case 'troubleshooting':
      return { matchCount: 10, threshold: 0.15 }
    case 'feature_inquiry':
      return { matchCount: isComplex ? 20 : 12, threshold: 0.08 } // Slightly lower threshold for better recall
    case 'off_topic':
      return { matchCount: 5, threshold: 0.3 } // High threshold for off-topic to minimize accidental context
    default:
      return { matchCount: isComplex ? 15 : 10, threshold: 0.1 }
  }
}

// ============================================
// MAIN ANALYZE FUNCTION
// ============================================

/**
 * Main function: Analyze query and return structured analysis
 */
export function analyzeQuery(query: string): QueryAnalysis {
  // 1. Normalize query (expand abbreviations)
  const normalizedQuery = normalizeQuery(query)
  
  // 2. Classify intent
  const intent = classifyIntent(query)
  
  // 3. Check complexity
  const complex = isComplexQuery(query)
  
  // 4. Decompose if complex
  const subQueries = complex ? decomposeQuery(query) : [query]
  
  // 5. Expand query terms
  const expandedTerms = expandQuery(query)
  
  // 6. Get suggested parameters
  const { matchCount, threshold } = getSearchParams(intent, complex)
  
  return {
    intent,
    subQueries,
    expandedTerms,
    isComplex: complex,
    suggestedMatchCount: matchCount,
    suggestedThreshold: threshold,
    originalQuery: query,
    normalizedQuery
  }
}

/**
 * Generate intent-specific system prompt additions
 */
export function getIntentPrompt(intent: QueryIntent): string {
  switch (intent) {
    case 'comparison':
      return `
# Lưu ý đặc biệt cho câu hỏi so sánh:
- Trình bày so sánh theo bảng hoặc list rõ ràng
- Nêu ưu/nhược điểm của từng lựa chọn
- Đưa ra khuyến nghị dựa trên nhu cầu người dùng
- Cung cấp link tài liệu cho cả hai đối tượng so sánh
`
    case 'how_to':
      return `
# Lưu ý đặc biệt cho câu hỏi hướng dẫn:
- Trả lời theo từng bước rõ ràng (Bước 1, Bước 2, ...)
- Sử dụng screenshots hoặc hình minh họa nếu có trong context
- Nêu rõ các lưu ý quan trọng
- Link đến tài liệu chi tiết
`
    case 'troubleshooting':
      return `
# Lưu ý đặc biệt cho câu hỏi khắc phục sự cố:
- Xác định nguyên nhân có thể có
- Đưa ra giải pháp từng bước
- Cảnh báo về các rủi ro nếu có
- Đề xuất liên hệ support nếu không giải quyết được
`
    case 'feature_inquiry':
      return `
# Lưu ý đặc biệt cho câu hỏi về tính năng:
- Liệt kê các tính năng chính
- Mô tả ngắn gọn mỗi tính năng
- Nêu trường hợp sử dụng phù hợp
- Link đến hướng dẫn chi tiết
`
    case 'off_topic':
      return `
# QUAN TRỌNG - PHẠM VI HỖ TRỢ:
- Câu hỏi này nằm ngoài phạm vi hỗ trợ của SmaxAI (đời sống, chính trị, kiến thức chung, v.v.).
- KHÔNG ĐƯỢC trả lời nội dung câu hỏi.
- HÃY từ chối khéo léo: "Dạ, là trợ lý chuyên biệt cho SmaxAI, mình chỉ có thể hỗ trợ các vấn đề liên quan đến nền tảng và kỹ thuật của phần mềm thôi ạ. Bạn có câu hỏi nào về SmaxAI không, mình sẵn sàng giải đáp nè!"
`
    default:
      return ''
  }
}