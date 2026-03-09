/**
 * Script: Chunk all documents from Outline to Supabase
 * 
 * Features:
 * - Sync docs from Outline to Supabase
 * - Find docs without chunks in document_sections
 * - Process sequentially with rate limiting
 * - Retry logic for failed chunks
 * - Progress tracking
 * 
 * Usage: npx tsx scripts/chunk-all-docs.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// Configuration
const CONFIG = {
  CHUNK_DELAY_MS: 1500,      // 1.5s between chunks
  DOC_DELAY_MS: 3000,        // 3s between docs
  BATCH_SIZE: 5,             // Process 5 docs then rest
  BATCH_DELAY_MS: 10000,     // 10s rest between batches
  MAX_RETRIES: 3,            // Max retry attempts
  RETRY_DELAY_MS: 5000,      // 5s wait before retry
  CHUNK_SIZE: 1000,          // Characters per chunk
  CHUNK_OVERLAP: 200,        // Overlap between chunks
}

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ Missing GEMINI_API_KEY')
  process.exit(1)
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Progress file path
const PROGRESS_FILE = path.resolve(process.cwd(), '.chunk-progress.json')

// Types
interface Document {
  id: string
  title: string
  content: string
  language: string
  external_id?: string
}

interface Progress {
  lastProcessedDocId: string | null
  processedDocs: string[]
  failedDocs: string[]
  totalChunks: number
  startTime: string
  lastUpdate: string
}

// Load progress from file
function loadProgress(): Progress {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch (e) {
    console.log('⚠️  Could not load progress file, starting fresh')
  }
  return {
    lastProcessedDocId: null,
    processedDocs: [],
    failedDocs: [],
    totalChunks: 0,
    startTime: new Date().toISOString(),
    lastUpdate: new Date().toISOString()
  }
}

// Save progress to file
function saveProgress(progress: Progress) {
  progress.lastUpdate = new Date().toISOString()
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2))
}

// Sleep utility
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Split text into chunks
function splitTextIntoChunks(text: string, chunkSize: number = CONFIG.CHUNK_SIZE, overlap: number = CONFIG.CHUNK_OVERLAP): string[] {
  if (!text || text.trim().length === 0) return []

  // Split by markdown headers first
  const sections = text.split(/(?=^#{1,6}\s)/m)
  
  const chunks: string[] = []
  let currentChunk = ''
  
  for (const section of sections) {
    if (!section.trim()) continue
    
    if (currentChunk.length + section.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      const overlapText = currentChunk.slice(-overlap)
      currentChunk = overlapText + section
    } else {
      currentChunk += section
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }
  
  // If chunks are still too large, split by paragraphs
  const finalChunks: string[] = []
  for (const chunk of chunks) {
    if (chunk.length <= chunkSize) {
      finalChunks.push(chunk)
    } else {
      const paragraphs = chunk.split('\n\n')
      let subChunk = ''
      
      for (const para of paragraphs) {
        if (subChunk.length + para.length > chunkSize && subChunk.length > 0) {
          finalChunks.push(subChunk.trim())
          subChunk = para
        } else {
          subChunk += '\n\n' + para
        }
      }
      
      if (subChunk.trim()) {
        finalChunks.push(subChunk.trim())
      }
    }
  }
  
  return finalChunks.filter(c => c.length > 50)
}

// Generate embedding using Gemini API
async function generateEmbedding(text: string, retryCount = 0): Promise<number[]> {
  const input = text.replace(/\n+/g, ' ').trim()

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text: input }] },
          outputDimensionality: 768,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || `API error: ${response.status}`)
    }

    const data = await response.json()
    const embedding = data.embedding?.values

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid embedding response')
    }

    return embedding
  } catch (error) {
    if (retryCount < CONFIG.MAX_RETRIES) {
      console.log(`    ⚠️  Retry ${retryCount + 1}/${CONFIG.MAX_RETRIES} after error: ${error}`)
      await sleep(CONFIG.RETRY_DELAY_MS)
      return generateEmbedding(text, retryCount + 1)
    }
    throw error
  }
}

// Fetch documents from Outline API
async function fetchOutlineDocuments(): Promise<any[]> {
  const OUTLINE_URL = process.env.OUTLINE_URL || 'https://docs.cdp.vn'
  const OUTLINE_API_KEY = process.env.OUTLINE_API_KEY

  if (!OUTLINE_API_KEY) {
    console.error('❌ Missing OUTLINE_API_KEY')
    return []
  }

  const apiKey = OUTLINE_API_KEY.startsWith('Bearer ') ? OUTLINE_API_KEY : `Bearer ${OUTLINE_API_KEY}`
  const allDocs: any[] = []
  let offset = 0
  const limit = 100

  console.log('📥 Fetching documents from Outline...')

  while (true) {
    try {
      const response = await fetch(`${OUTLINE_URL}/api/documents.list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey,
        },
        body: JSON.stringify({ limit, offset }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        console.error('Outline API error:', data)
        break
      }

      const docs = data.data || []
      if (docs.length === 0) break

      allDocs.push(...docs)
      console.log(`  📄 Fetched ${allDocs.length} documents...`)

      if (docs.length < limit) break
      offset += limit

      // Safety break
      if (offset > 10000) {
        console.warn('⚠️  Reached 10000 docs limit')
        break
      }
    } catch (error) {
      console.error('Error fetching from Outline:', error)
      break
    }
  }

  console.log(`✅ Total documents from Outline: ${allDocs.length}`)
  return allDocs
}

// Sync documents to Supabase
async function syncDocumentsToSupabase(outlineDocs: any[]): Promise<Document[]> {
  console.log('\n📤 Syncing documents to Supabase...')

  const viCollectionId = (process.env.OUTLINE_COLLECTION_VI_ID || '').trim()
  const enCollectionId = (process.env.OUTLINE_COLLECTION_EN_ID || '').trim()

  const syncedDocs: Document[] = []

  for (const doc of outlineDocs) {
    // Determine language
    const language = doc.collectionId === enCollectionId ? 'en' : 'vi'

    // Get full document content
    let content = doc.text || ''
    
    // If content is empty or too short, try to fetch full document
    if (!content || content.length < 100) {
      try {
        const OUTLINE_URL = process.env.OUTLINE_URL || 'https://docs.cdp.vn'
        const OUTLINE_API_KEY = process.env.OUTLINE_API_KEY
        const apiKey = OUTLINE_API_KEY?.startsWith('Bearer ') ? OUTLINE_API_KEY : `Bearer ${OUTLINE_API_KEY}`

        const response = await fetch(`${OUTLINE_URL}/api/documents.info`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': apiKey,
          },
          body: JSON.stringify({ id: doc.id }),
        })

        const data = await response.json()
        if (data.data?.text) {
          content = data.data.text
        }
      } catch (e) {
        console.warn(`  ⚠️  Could not fetch full content for ${doc.title}`)
      }
    }

    const docData = {
      id: doc.id,
      external_id: doc.urlId || doc.id,
      title: doc.title,
      slug: doc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      language,
      path: doc.url || '',
      content,
      meta: {
        outline_url: doc.url,
        collection_id: doc.collectionId,
        parent_document_id: doc.parentDocumentId,
      },
      last_updated: doc.updatedAt || new Date().toISOString(),
    }

    // Upsert to Supabase
    const { error } = await supabaseAdmin
      .from('documents')
      .upsert(docData, { onConflict: 'id' })

    if (error) {
      console.error(`  ❌ Error syncing ${doc.title}:`, error.message)
    } else {
      syncedDocs.push({
        id: doc.id,
        title: doc.title,
        content,
        language,
        external_id: docData.external_id,
      })
    }
  }

  console.log(`✅ Synced ${syncedDocs.length} documents to Supabase`)
  return syncedDocs
}

// Get docs that need chunking
async function getDocsNeedingChunking(allDocs: Document[]): Promise<Document[]> {
  console.log('\n🔍 Checking which documents need chunking...')

  // Get all document IDs that have chunks
  const { data: sections, error } = await supabaseAdmin
    .from('document_sections')
    .select('document_id')

  if (error) {
    console.error('Error fetching sections:', error)
    return allDocs
  }

  const docsWithChunks = new Set(sections?.map(s => s.document_id) || [])
  const needsChunking = allDocs.filter(doc => !docsWithChunks.has(doc.id))

  console.log(`  📊 Documents with chunks: ${docsWithChunks.size}`)
  console.log(`  📊 Documents needing chunking: ${needsChunking.length}`)

  return needsChunking
}

// Process a single document
async function processDocument(doc: Document, progress: Progress): Promise<boolean> {
  console.log(`\n📄 Processing: ${doc.title}`)
  console.log(`   ID: ${doc.id}`)
  console.log(`   Language: ${doc.language}`)
  console.log(`   Content length: ${doc.content.length} chars`)

  if (!doc.content || doc.content.length < 50) {
    console.log(`  ⚠️  Skipping - content too short or empty`)
    return false
  }

  try {
    // Delete existing chunks for this document
    const { error: deleteError } = await supabaseAdmin
      .from('document_sections')
      .delete()
      .eq('document_id', doc.id)

    if (deleteError) {
      console.error(`  ❌ Error deleting old chunks:`, deleteError.message)
    }

    // Split into chunks
    const chunks = splitTextIntoChunks(doc.content)
    console.log(`  📦 Split into ${chunks.length} chunks`)

    if (chunks.length === 0) {
      console.log(`  ⚠️  No chunks generated`)
      return false
    }

    // Process each chunk
    let successCount = 0
    for (let i = 0; i < chunks.length; i++) {
      const chunkContent = chunks[i]
      
      console.log(`  🔄 Processing chunk ${i + 1}/${chunks.length}...`)

      try {
        // Generate embedding
        const embedding = await generateEmbedding(chunkContent)

        // Insert to database
        const { error: insertError } = await supabaseAdmin
          .from('document_sections')
          .insert({
            document_id: doc.id,
            content: chunkContent,
            embedding,
            chunk_index: i,
            chunk_count: chunks.length,
            token_count: Math.ceil(chunkContent.length / 4),
          })

        if (insertError) {
          console.error(`    ❌ Error inserting chunk ${i}:`, insertError.message)
        } else {
          successCount++
          progress.totalChunks++
        }

        // Rate limiting - wait between chunks
        if (i < chunks.length - 1) {
          await sleep(CONFIG.CHUNK_DELAY_MS)
        }
      } catch (error) {
        console.error(`    ❌ Error processing chunk ${i}:`, error)
      }
    }

    console.log(`  ✅ Successfully processed ${successCount}/${chunks.length} chunks`)
    return successCount > 0

  } catch (error) {
    console.error(`  ❌ Error processing document:`, error)
    return false
  }
}

// Main function
async function main() {
  console.log('🚀 Starting document chunking process...')
  console.log('==========================================')
  console.log(`Configuration:`)
  console.log(`  - Chunk size: ${CONFIG.CHUNK_SIZE} chars`)
  console.log(`  - Chunk overlap: ${CONFIG.CHUNK_OVERLAP} chars`)
  console.log(`  - Chunk delay: ${CONFIG.CHUNK_DELAY_MS}ms`)
  console.log(`  - Doc delay: ${CONFIG.DOC_DELAY_MS}ms`)
  console.log(`  - Batch size: ${CONFIG.BATCH_SIZE}`)
  console.log('==========================================\n')

  // Load progress
  const progress = loadProgress()
  console.log(`📊 Previous progress: ${progress.processedDocs.length} docs processed, ${progress.totalChunks} chunks created`)

  // Step 1: Fetch documents from Outline
  const outlineDocs = await fetchOutlineDocuments()

  if (outlineDocs.length === 0) {
    console.log('❌ No documents found in Outline')
    return
  }

  // Step 2: Sync to Supabase
  const syncedDocs = await syncDocumentsToSupabase(outlineDocs)

  // Step 3: Get docs needing chunking
  const docsToProcess = await getDocsNeedingChunking(syncedDocs)

  if (docsToProcess.length === 0) {
    console.log('\n✅ All documents already have chunks!')
    return
  }

  // Step 4: Process documents with rate limiting
  console.log('\n🔄 Starting chunking process...')
  console.log('==========================================\n')

  let processedCount = 0
  let failedCount = 0

  for (let i = 0; i < docsToProcess.length; i++) {
    const doc = docsToProcess[i]

    // Skip already processed (for resume)
    if (progress.processedDocs.includes(doc.id)) {
      console.log(`⏭️  Skipping already processed: ${doc.title}`)
      continue
    }

    console.log(`\n[Progress: ${processedCount + 1}/${docsToProcess.length}]`)

    // Process the document
    const success = await processDocument(doc, progress)

    if (success) {
      progress.processedDocs.push(doc.id)
      processedCount++
    } else {
      progress.failedDocs.push(doc.id)
      failedCount++
    }

    // Save progress
    saveProgress(progress)

    // Batch rest
    if ((i + 1) % CONFIG.BATCH_SIZE === 0 && i < docsToProcess.length - 1) {
      console.log(`\n😴 Batch rest (${CONFIG.BATCH_DELAY_MS}ms)...`)
      await sleep(CONFIG.BATCH_DELAY_MS)
    } else if (i < docsToProcess.length - 1) {
      // Doc rest
      await sleep(CONFIG.DOC_DELAY_MS)
    }
  }

  // Final summary
  console.log('\n==========================================')
  console.log('📊 FINAL SUMMARY')
  console.log('==========================================')
  console.log(`✅ Documents processed: ${processedCount}`)
  console.log(`❌ Documents failed: ${failedCount}`)
  console.log(`📦 Total chunks created: ${progress.totalChunks}`)
  console.log(`⏱️  Duration: ${Math.round((Date.now() - new Date(progress.startTime).getTime()) / 60000)} minutes`)
  console.log('==========================================\n')

  // List failed docs
  if (progress.failedDocs.length > 0) {
    console.log('Failed documents:')
    for (const id of progress.failedDocs) {
      const doc = docsToProcess.find(d => d.id === id)
      console.log(`  - ${doc?.title || id}`)
    }
  }
}

// Run
main().catch(console.error)