/**
 * Enhanced Search Module
 *
 * Features:
 * 1. Query Expansion - Generate related query variants
 * 2. Broader Search - Increase match count for better recall
 * 3. Heuristic Re-ranking - Reorder results by relevance
 */

import { hybridSearch, SearchResult } from './hybrid-search'
import { generateEmbedding } from './embeddings'

export interface ExpandedQuery {
  original: string
  variants: string[]
}

/**
 * Expand query with related terms and synonyms
 * This helps catch documents that use different wording
 */
export function expandQueryVariants(query: string): string[] {
  const variants: string[] = [query]
  const lowerQuery = query.toLowerCase()

  // Vietnamese telecom terms
  const telecomTerms: Record<string, string[]> = {
    'số điện thoại': ['phone number', 'sdt', 'điện thoại', 'liên hệ', 'contact'],
    'thu thập': ['thu thập', 'thu', 'lấy', 'xin', 'collection', 'gather', 'extract'],
    'zalo user': ['zalo user', 'zalo cá nhân', 'zalo user', 'người dùng zalo'],
    'messenger': ['messenger', 'facebook', 'fb', 'facebook messenger'],
    'kết bạn': ['kết bạn', 'add friend', 'thêm bạn', 'friending'],
    'thông tin khách hàng': ['thông tin khách hàng', 'customer info', 'khách hàng', 'user info'],
    'chatbot': ['chatbot', 'bot', 'automation', 'tự động'],
    'thẻ': ['thẻ', 'card', 'form', 'biểu mẫu'],
    'xin': ['xin', 'yêu cầu', 'request', 'ask', 'lấy'],
  }

  // English tech terms
  const techTerms: Record<string, string[]> = {
    'collect': ['collect', 'gather', 'extract', 'capture', 'get'],
    'phone': ['phone', 'phone number', 'contact', 'mobile', 'sdt'],
    'user': ['user', 'customer', 'contact', 'client'],
    'friend': ['friend', 'add', 'connect'],
    'information': ['information', 'info', 'data', 'details'],
  }

  // Generate variants
  const allTerms = { ...telecomTerms, ...techTerms }

  for (const [key, synonyms] of Object.entries(allTerms)) {
    if (lowerQuery.includes(key)) {
      for (const syn of synonyms) {
        const variant = lowerQuery.replace(key, syn)
        if (variant !== lowerQuery && !variants.includes(variant)) {
          variants.push(variant)
        }
      }
    }
  }

  // Extract key topics and create combinations
  const topics: string[] = []

  // Zalo-related
  if (lowerQuery.includes('zalo')) {
    topics.push('zalo', 'zalo oa', 'zalo user', 'zalo cá nhân')
  }

  // Messenger/Facebook
  if (lowerQuery.includes('messenger') || lowerQuery.includes('facebook') || lowerQuery.includes('fb')) {
    topics.push('messenger', 'facebook', 'facebook messenger')
  }

  // Phone/contact
  if (lowerQuery.includes('số điện thoại') || lowerQuery.includes('phone') || lowerQuery.includes('sđt')) {
    topics.push('số điện thoại', 'phone number', 'thông tin liên hệ')
  }

  // Customer info
  if (lowerQuery.includes('thông tin') || lowerQuery.includes('info')) {
    topics.push('thông tin khách hàng', 'customer information', 'user info')
  }

  // Chatbot
  if (lowerQuery.includes('chatbot') || lowerQuery.includes('bot')) {
    topics.push('chatbot', 'bot auto', 'automation')
  }

  // Create topic-based variants
  if (topics.length >= 2) {
    for (let i = 0; i < topics.length; i++) {
      for (let j = i + 1; j < topics.length; j++) {
        variants.push(`${topics[i]} ${topics[j]}`)
      }
    }
  }

  // Remove duplicates and limit
  const uniqueVariants = [...new Set(variants)]

  // Return max 5 variants to avoid too many API calls
  return uniqueVariants.slice(0, 5)
}

/**
 * Extract main topics from query for better search
 */
export function extractTopics(query: string): string[] {
  const topics: string[] = []
  const lowerQuery = query.toLowerCase()

  // Channel detection
  const channels = [
    { keyword: 'zalo', value: 'zalo' },
    { keyword: 'messenger', value: 'messenger' },
    { keyword: 'facebook', value: 'facebook' },
    { keyword: 'telegram', value: 'telegram' },
    { keyword: 'instagram', value: 'instagram' },
  ]

  for (const { keyword, value } of channels) {
    if (lowerQuery.includes(keyword)) {
      topics.push(value)
    }
  }

  // Action detection
  const actions = [
    { keyword: 'thu thập', value: 'thu thập' },
    { keyword: 'lấy', value: 'lấy thông tin' },
    { keyword: 'xin', value: 'xin thông tin' },
    { keyword: 'kết bạn', value: 'kết bạn' },
    { keyword: 'tạo', value: 'tạo' },
    { keyword: 'cài đặt', value: 'cài đặt' },
  ]

  for (const { keyword, value } of actions) {
    if (lowerQuery.includes(keyword)) {
      topics.push(value)
    }
  }

  // Data type detection
  const dataTypes = [
    { keyword: 'số điện thoại', value: 'số điện thoại' },
    { keyword: 'phone', value: 'số điện thoại' },
    { keyword: 'thông tin', value: 'thông tin' },
    { keyword: 'info', value: 'thông tin' },
  ]

  for (const { keyword, value } of dataTypes) {
    if (lowerQuery.includes(keyword)) {
      topics.push(value)
    }
  }

  return topics
}

/**
 * Calculate keyword overlap score for re-ranking
 */
function calculateKeywordScore(query: string, result: SearchResult): number {
  const queryLower = query.toLowerCase()
  const contentLower = (result.content || '').toLowerCase()
  const titleLower = (result.document_title || '').toLowerCase()

  // Extract key terms from query
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2)

  let score = 0
  let matches = 0

  for (const term of queryTerms) {
    // Title matches weighted higher
    if (titleLower.includes(term)) {
      score += 3
      matches++
    }
    // Content matches
    if (contentLower.includes(term)) {
      score += 1
      matches++
    }
  }

  // Bonus for exact phrase match in title
  if (titleLower.includes(queryLower)) {
    score += 5
  }

  // Bonus for exact phrase match in content
  if (contentLower.includes(queryLower)) {
    score += 2
  }

  // Normalize by query length
  const normalizedScore = score / Math.max(queryTerms.length, 1)

  return normalizedScore
}

/**
 * Re-rank search results using multiple signals
 */
export function rerankResults(
  query: string,
  results: SearchResult[],
  weights: {
    keywordWeight: number
    vectorWeight: number
    textWeight: number
    trigramWeight: number
  } = { keywordWeight: 0.4, vectorWeight: 0.3, textWeight: 0.2, trigramWeight: 0.1 }
): SearchResult[] {
  if (results.length === 0) return results

  // Calculate keyword overlap score
  const keywordScores = results.map(r => calculateKeywordScore(query, r))
  const maxKeywordScore = Math.max(...keywordScores, 1)

  // Normalize and combine scores
  const reranked = results.map((result, index) => {
    const keywordScore = keywordScores[index] / maxKeywordScore

    // Combine all scores
    const finalScore =
      keywordScore * weights.keywordWeight +
      (result.vector_score || result.similarity) * weights.vectorWeight +
      (result.text_score || 0) * weights.textWeight +
      (result.trigram_score || 0) * weights.trigramWeight

    return {
      ...result,
      similarity: finalScore,
      _keywordScore: keywordScore,
      _vectorScore: result.vector_score || result.similarity,
      _textScore: result.text_score || 0,
      _trigramScore: result.trigram_score || 0,
    }
  })

  // Sort by final score descending
  reranked.sort((a, b) => (b.similarity || 0) - (a.similarity || 0))

  // Remove internal scoring fields
  return reranked.map(({ _keywordScore, _vectorScore, _textScore, _trigramScore, ...rest }) => rest)
}

/**
 * Enhanced search with query expansion and re-ranking
 */
export async function enhancedSearch(
  query: string,
  lang?: string,
  options?: {
    expandVariants?: boolean
    useReranking?: boolean
    matchCount?: number
    matchThreshold?: number
  }
): Promise<SearchResult[]> {
  const {
    expandVariants = true,
    useReranking = true,
    matchCount = 25,  // Increased from 10 for broader search
    matchThreshold = 0.05,  // Lower threshold for more results
  } = options || {}

  console.log('[EnhancedSearch] Query:', query)
  console.log('[EnhancedSearch] Options:', { expandVariants, useReranking, matchCount, matchThreshold })

  let allResults: SearchResult[] = []
  const seenIds = new Set<string>()

  // Step 1: Generate query variants if enabled
  const queries = expandVariants ? expandQueryVariants(query) : [query]
  console.log('[EnhancedSearch] Expanded queries:', queries)

  // Step 2: Search with each variant
  for (const searchQuery of queries) {
    try {
      // Generate embedding for this variant
      const embedding = await generateEmbedding(searchQuery)

      // Perform hybrid search
      const results = await hybridSearch({
        queryEmbedding: embedding,
        queryText: searchQuery,
        lang,
        matchThreshold,
        matchCount: Math.ceil(matchCount / queries.length),  // Distribute budget
        vectorWeight: 0.4,
        textWeight: 0.4,
        trigramWeight: 0.2,
      })

      // Add unique results
      for (const result of results) {
        if (!seenIds.has(result.id)) {
          seenIds.add(result.id)
          allResults.push(result)
        }
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      console.error('[EnhancedSearch] Error searching variant:', searchQuery, error)
    }
  }

  console.log('[EnhancedSearch] Total results before rerank:', allResults.length)

  // Step 3: Re-rank results if enabled
  if (useReranking && allResults.length > 0) {
    allResults = rerankResults(query, allResults)
    console.log('[EnhancedSearch] Results after rerank:', allResults.length)
  }

  // Limit final results and add title field for compatibility
  return allResults.slice(0, matchCount).map(r => ({
    ...r,
    title: r.document_title || r.title || 'Untitled'
  }))
}
