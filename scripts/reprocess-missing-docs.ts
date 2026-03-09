/**
 * Script: Reprocess Missing Docs
 * 
 * Handles the 37 docs that failed or were skipped:
 * 1. Check why they failed (content too short, empty, etc.)
 * 2. Reprocess docs with valid content
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const CONFIG = {
  CHUNK_DELAY_MS: 1500,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 5000,
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Failed doc IDs from progress file
const FAILED_DOC_IDS = [
  "0c091f44-fe58-4cb5-b16f-4da7b375de2b",
  "7137f4fe-9a42-4515-99e8-0cf404b4f220",
  "4dab97a7-77ab-4447-b0b6-c720dd4410bd",
  "35cb2ab8-488d-493e-952d-a15e50566b33",
  "dc90b028-1874-47b7-8281-1122e66d43ab",
  "55d41e17-b073-4d12-b1af-9255320cf0d6",
  "b28380c4-bb29-4a94-9491-16223abe9dd3",
  "6397f071-3864-46c4-ab9e-8db121a0c2cf",
  "a4e044a8-bf39-4e7d-91e8-2121575055d7",
  "ad89f392-52c8-42b9-ab8e-41e26c3052c3",
  "f92f140a-c065-484c-af0b-b0f6a1212540",
  "7c0b6407-0e1e-402e-b1ef-d1b48177432b",
  "8743542c-8de4-4f2c-9ad7-f73b47b97f42",
  "ea95ba64-d48e-4216-8f35-9c0693028e50",
  "baea8957-f253-478b-9f00-1a9570c831a0",
  "36671512-2e29-4dbc-9e4e-a42715d71120",
  "fdae4b54-9e73-4100-bc0a-ae992eedebfa",
  "82f6944a-b601-48ee-a73f-b5317851cf40",
  "459e1705-c769-4b93-a65e-81f7cd5cb81a",
  "18c2b5ec-98fb-446a-aa3f-dad02bee484a",
  "c4f147f6-300f-4d81-ade6-63b64d6772aa",
  "83890e1a-ee61-4250-9179-a521f84c1c6d",
  "3edfffa9-1723-46a8-90a4-8dda3d54954d",
  "ed2dd865-858e-4424-8902-88fa8527bfd8",
  "e630d894-eb9f-45e5-8655-a6081e0cab48",
  "badc509b-5334-4fe1-9dde-ef471f3e2e39",
  "a7abd0c8-f75e-4049-9ee5-c48f10cc838e",
  "bf98aac1-df59-4274-b39c-03cfb511d25d",
  "60a0fb92-ffde-4d1b-8f2e-f57001a3c656",
  "5214e15c-bb4a-4652-892d-db0c3e6e93a9",
  "05f434d4-c02d-4403-bdfa-be5808e11a66",
  "01544de0-781f-44a4-8cf4-60b95b64997c",
  "13c7c3d0-43eb-4945-aab7-c88dd410c146",
  "753e7104-282b-4940-9306-8d18c8fd9206",
  "61b157b1-ff51-4139-9949-ad3325bd5283",
  "aa085545-afda-4d2f-9026-508246cbf6c8",
  "68a58fe2-7da0-4fc5-a39d-feb7d009bf12",
]

function splitTextIntoChunks(text: string, chunkSize = 1000, overlap = 200): string[] {
  if (!text || text.trim().length === 0) return []
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
  if (currentChunk.trim()) chunks.push(currentChunk.trim())
  
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
      if (subChunk.trim()) finalChunks.push(subChunk.trim())
    }
  }
  return finalChunks.filter(c => c.length > 50)
}

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
    if (!embedding || !Array.isArray(embedding)) throw new Error('Invalid embedding response')
    return embedding
  } catch (error) {
    if (retryCount < CONFIG.MAX_RETRIES) {
      console.log(`    ⚠️  Retry ${retryCount + 1}/${CONFIG.MAX_RETRIES}`)
      await sleep(CONFIG.RETRY_DELAY_MS)
      return generateEmbedding(text, retryCount + 1)
    }
    throw error
  }
}

async function main() {
  console.log('🔄 Reprocessing Missing Documents...\n')
  console.log('========================================')

  // Get failed docs from database
  const { data: docs, error } = await supabaseAdmin
    .from('documents')
    .select('id, title, content, language')
    .in('id', FAILED_DOC_IDS)

  if (error) {
    console.error('Error fetching docs:', error)
    return
  }

  console.log(`📄 Found ${docs?.length || 0} failed documents\n`)

  // Categorize docs
  const emptyDocs: any[] = []
  const shortDocs: any[] = []
  const validDocs: any[] = []

  for (const doc of docs || []) {
    if (!doc.content || doc.content.trim().length === 0) {
      emptyDocs.push(doc)
    } else if (doc.content.length < 50) {
      shortDocs.push(doc)
    } else {
      validDocs.push(doc)
    }
  }

  console.log(`📊 Categories:`)
  console.log(`   - Empty content: ${emptyDocs.length}`)
  console.log(`   - Too short (< 50 chars): ${shortDocs.length}`)
  console.log(`   - Valid for processing: ${validDocs.length}`)
  console.log('========================================\n')

  // Show empty and short docs
  if (emptyDocs.length > 0) {
    console.log('❌ Empty documents (skipped):')
    emptyDocs.forEach(d => console.log(`   - ${d.title}`))
    console.log('')
  }

  if (shortDocs.length > 0) {
    console.log('⚠️  Short documents (skipped):')
    shortDocs.forEach(d => console.log(`   - ${d.title} (${d.content?.length || 0} chars)`))
    console.log('')
  }

  // Process valid docs
  if (validDocs.length === 0) {
    console.log('✅ No valid documents to process')
    return
  }

  console.log(`🔄 Processing ${validDocs.length} valid documents...\n`)

  let processed = 0
  let failed = 0

  for (const doc of validDocs) {
    console.log(`📄 Processing: ${doc.title}`)
    console.log(`   Content length: ${doc.content.length} chars`)

    try {
      // Split into chunks
      const chunks = splitTextIntoChunks(doc.content)
      console.log(`   📦 Split into ${chunks.length} chunks`)

      if (chunks.length === 0) {
        console.log(`   ⚠️  No chunks generated after filtering`)
        failed++
        continue
      }

      // Process each chunk
      let successCount = 0
      for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i]
        console.log(`   🔄 Chunk ${i + 1}/${chunks.length}...`)

        try {
          const embedding = await generateEmbedding(chunkContent)
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
            console.error(`   ❌ Error inserting chunk ${i}:`, insertError.message)
          } else {
            successCount++
          }

          if (i < chunks.length - 1) await sleep(CONFIG.CHUNK_DELAY_MS)
        } catch (err) {
          console.error(`   ❌ Error processing chunk ${i}:`, err)
        }
      }

      if (successCount > 0) {
        console.log(`   ✅ Successfully processed ${successCount}/${chunks.length} chunks\n`)
        processed++
      } else {
        console.log(`   ❌ Failed to process any chunks\n`)
        failed++
      }

      // Delay between docs
      await sleep(2000)
    } catch (err) {
      console.error(`   ❌ Error:`, err)
      failed++
    }
  }

  console.log('========================================')
  console.log('📊 FINAL SUMMARY')
  console.log('========================================')
  console.log(`✅ Processed: ${processed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`⚠️  Empty/Short (skipped): ${emptyDocs.length + shortDocs.length}`)
  console.log('========================================')
}

main().catch(console.error)