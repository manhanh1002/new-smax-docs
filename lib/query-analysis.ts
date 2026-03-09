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
// ============================================
const VIETNAMESE_ABBREVIATIONS: Record<string, string> = {
  // Viết tắt phổ biến
  'ko': 'không',
  'k': 'không',
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
  'mk': 'mình',  // cũng có thể là mật khẩu, nhưng phổ biến là mình
  'mjnh': 'mình',
  'mjk': 'mình',
  'aj': 'ai',
  'đâj': 'đây',
  'z': 'vậy',
  'r': 'rồi',
  't': 'tao',
  'm': 'mày',
  'b': 'bạn',
  'a': 'anh',
  'e': 'em',
  'c': 'chị',
  'ch': 'cho',
  'h': 'giờ',
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
// ============================================
const DOMAIN_TERM_MAPPINGS: Record<string, string[]> = {
  'ai': ['GenAI', 'trí tuệ nhân tạo', 'artificial intelligence'],
  'bot': ['bot auto', 'chatbot', 'automation', 'tự động'],
  'oa': ['Official Account', 'Zalo OA'],
  'zalo': ['Zalo OA', 'Zalo Official Account'],
  'fb': ['Facebook', 'Facebook Messenger'],
  'tele': ['Telegram'],
  'messenger': ['Facebook Messenger', 'Meta Messenger'],
  'smax': ['SmaxAI', 'Smax'],
  'livechat': ['Live Chat', 'trò chuyện trực tuyến'],
  'api': ['API', 'giao diện lập trình'],
  'webhook': ['Webhook', 'kết nối API'],
  'broadcast': ['Broadcast', 'gửi tin nhắn hàng loạt'],
  'segment': ['Segment', 'phân nhóm khách hàng'],
  'trigger': ['Trigger', 'kích hoạt tự động'],
  'template': ['Template', 'mẫu tin nhắn'],
  'dashboard': ['Dashboard', 'bảng điều khiển'],
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
    'xin chào', 'hello', 'hi', 'chào', 'hey', 'good morning', 'good afternoon'
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
  
  // Check other intents
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (intent === 'greeting' || intent === 'general') continue
    
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword)) {
        return intent as QueryIntent
      }
    }
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
 */
export function getSearchParams(intent: QueryIntent, isComplex: boolean): {
  matchCount: number
  threshold: number
} {
  switch (intent) {
    case 'comparison':
      return { matchCount: isComplex ? 10 : 8, threshold: 0.25 }
    case 'how_to':
      return { matchCount: 6, threshold: 0.3 }
    case 'troubleshooting':
      return { matchCount: 5, threshold: 0.35 }
    case 'feature_inquiry':
      return { matchCount: isComplex ? 8 : 5, threshold: 0.28 }
    default:
      return { matchCount: 5, threshold: 0.3 }
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
    default:
      return ''
  }
}