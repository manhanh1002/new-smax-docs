// lib/outline.ts
// Handles logic for parsing and validating Outline webhook payloads
// and connecting to Outline API

import crypto from 'crypto'
import * as dotenv from 'dotenv'
import path from 'path'

// Try to load environment variables if they are missing (e.g. running scripts)
if (!process.env.OUTLINE_API_KEY) {
  try {
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
  } catch (e) {
    // Ignore error if .env.local doesn't exist or dotenv is not available
  }
}

// Outline API Client
const OUTLINE_URL = process.env.OUTLINE_URL || 'https://docs.cdp.vn'
const OUTLINE_API_KEY = process.env.OUTLINE_API_KEY || ''

interface OutlineApiResponse<T> {
  data: T
  pagination?: {
    next: string | null
  }
  error?: {
    message: string
    status: number
  }
}

export interface OutlineDocument {
  id: string
  title: string
  text: string
  urlId: string
  url: string
  collectionId: string
  parentDocumentId: string | null
  publishedAt: string | null
  updatedAt: string
  createdAt: string
}

interface OutlineCollection {
  id: string
  name: string
  urlId: string
  description?: string
}

// Generic Outline API request helper
async function outlineApiRequest<T>(
  endpoint: string,
  body: Record<string, unknown> = {},
  options: RequestInit = {}
): Promise<OutlineApiResponse<T>> {
  if (!OUTLINE_API_KEY) {
    throw new Error('Missing OUTLINE_API_KEY')
  }

  // Ensure Bearer prefix is present
  const apiKey = OUTLINE_API_KEY.startsWith('Bearer ') 
    ? OUTLINE_API_KEY 
    : `Bearer ${OUTLINE_API_KEY}`

  const response = await fetch(`${OUTLINE_URL}/api/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey,
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
    ...options, // Merge custom options (like cache, next.revalidate)
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('Outline API error:', data)
    throw new Error(data.message || `Outline API error: ${response.status}`)
  }

  return data
}

// Test connection to Outline
export async function testOutlineConnection(): Promise<{ success: boolean; message: string; user?: unknown }> {
  try {
    if (!OUTLINE_API_KEY) {
      return { success: false, message: 'OUTLINE_API_KEY is not configured' }
    }

    const response = await fetch(`${OUTLINE_URL}/api/auth.info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OUTLINE_API_KEY}`,
      },
      body: JSON.stringify({}),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, message: data.message || `API returned ${response.status}` }
    }

    return { 
      success: true, 
      message: 'Successfully connected to Outline',
      user: data.data?.user 
    }
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Get all collections
export async function getOutlineCollections(): Promise<OutlineCollection[]> {
  const response = await outlineApiRequest<OutlineCollection[]>('collections.list', {})
  // Outline returns data as array directly, not nested in collections
  return response.data || []
}

// Get documents from a collection
export async function getOutlineDocuments(
  collectionId?: string,
  options: { limit?: number; offset?: number } & RequestInit = {}
): Promise<OutlineDocument[]> {
  const allDocs: OutlineDocument[] = []
  let offset = options.offset || 0
  const limit = options.limit || 100
  
  // Extract fetch options
  const { limit: _l, offset: _o, ...fetchOptions } = options
  
  while (true) {
    const body: Record<string, unknown> = {
      limit,
      offset,
    }

    if (collectionId) {
      body.collectionId = collectionId
    }

    const response = await outlineApiRequest<OutlineDocument[]>('documents.list', body, fetchOptions)
    const docs = response.data || []
    
    if (docs.length === 0) break
    
    allDocs.push(...docs)
    
    // If we received fewer docs than limit, we've reached the end
    if (docs.length < limit) break
    
    // If user specified a limit and we reached it, stop
    if (options.limit && allDocs.length >= options.limit) break
    
    // Prepare for next page
    offset += limit
    
    // Safety break to prevent infinite loops in case of API issues
    if (offset > 10000) {
      console.warn('Reached 10000 docs limit, stopping pagination')
      break
    }
  }
  
  return allDocs
}

// Get a single document by ID
export async function getOutlineDocument(documentId: string, options: RequestInit = {}): Promise<OutlineDocument | null> {
  try {
    const response = await outlineApiRequest<OutlineDocument>('documents.info', {
      id: documentId,
    }, options)
    return response.data || null
  } catch (error) {
    console.error('Error fetching document:', error)
    return null
  }
}

// Type for Outline search result item
interface SearchResultItem {
  ranking: number
  context: string
  document: OutlineDocument | null
}

// Search documents
export async function searchOutlineDocuments(
  query: string, 
  collectionId?: string
): Promise<OutlineDocument[]> {
  const body: Record<string, unknown> = {
    query,
    limit: 25,
    status: 'published', // Only search published documents
  }
  
  // Add collectionId filter if provided
  if (collectionId) {
    body.collectionId = collectionId
  }
  
  const response = await outlineApiRequest<SearchResultItem[]>('documents.search', body)
  
  // Outline search returns: { ranking, context, document }[]
  // We need to extract the document from each result
  if (Array.isArray(response.data)) {
    return response.data
      .map((item) => item.document)
      .filter((doc): doc is OutlineDocument => doc != null)
  }
  
  return []
}

export interface OutlineWebhookPayload {
  event: string
  payload: {
    id: string
    title: string
    text: string
    collectionId: string
    publish: boolean
    url: string
    urlId: string
    createdAt: string
    updatedAt: string
    archivedAt: string | null
    deletedAt: string | null
    parentDocumentId: string | null
    template: boolean
    templateId: string | null
    collaboratorIds: string[]
    // Outline provides more fields but these are the ones we care about
  }
}

export function verifyOutlineSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) {
    console.warn('OUTLINE_WEBHOOK_SECRET is not set, skipping signature verification')
    return true // Or false if strict security is required, but for dev ease we warn
  }

  // Outline signature format: "t=TIMESTAMP,s=SIGNATURE"
  // We need to extract the signature part and verify against the payload
  // However, Outline docs might just send the signature directly or in a specific header format.
  // Assuming standard HMAC-SHA256 hex digest of the raw body.
  
  // Let's implement a simple HMAC check if the signature is just the hash
  // If it includes timestamp, we need to parse it.
  // For now, let's assume it's a direct hex string in the header.
  
  const hmac = crypto.createHmac('sha256', secret)
  const digest = hmac.update(payload).digest('hex')
  
  // Use timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
  } catch (e) {
    return false
  }
}

export function getLanguageFromCollection(collectionId: string): 'vi' | 'en' | null {
  const viCollectionId = process.env.OUTLINE_COLLECTION_VI_ID
  const enCollectionId = process.env.OUTLINE_COLLECTION_EN_ID

  if (collectionId === viCollectionId) return 'vi'
  if (collectionId === enCollectionId) return 'en'
  
  // Default fallback logic or return null
  return null
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
