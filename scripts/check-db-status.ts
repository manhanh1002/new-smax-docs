/**
 * Script: Check DB Status - Duplicates, Missing, Failed
 * 
 * Checks:
 * 1. Total docs in documents table
 * 2. Total chunks in document_sections
 * 3. Duplicates in document_sections
 * 4. Docs without chunks
 * 5. Failed docs details
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkStatus() {
  console.log('🔍 Checking Database Status...\n')
  console.log('========================================')

  // 1. Check documents table
  const { data: documents, error: docError } = await supabaseAdmin
    .from('documents')
    .select('id, title, language')

  if (docError) {
    console.error('Error fetching documents:', docError)
    return
  }

  console.log(`📄 Total documents: ${documents?.length || 0}`)
  console.log(`   - Vietnamese: ${documents?.filter(d => d.language === 'vi').length || 0}`)
  console.log(`   - English: ${documents?.filter(d => d.language === 'en').length || 0}`)

  // 2. Check document_sections table
  const { data: sections, error: secError } = await supabaseAdmin
    .from('document_sections')
    .select('id, document_id, chunk_index, chunk_count')

  if (secError) {
    console.error('Error fetching sections:', secError)
    return
  }

  console.log(`\n📦 Total chunks: ${sections?.length || 0}`)

  // 3. Check for duplicates (same document_id + chunk_index)
  const chunkMap = new Map<string, number>()
  const duplicates: string[] = []

  for (const section of sections || []) {
    const key = `${section.document_id}-${section.chunk_index}`
    if (chunkMap.has(key)) {
      duplicates.push(section.id)
    } else {
      chunkMap.set(key, 1)
    }
  }

  if (duplicates.length > 0) {
    console.log(`\n⚠️  Found ${duplicates.length} duplicate chunks!`)
    console.log('   First 5 duplicate IDs:', duplicates.slice(0, 5))
  } else {
    console.log('\n✅ No duplicate chunks found')
  }

  // 4. Check docs without chunks
  const docsWithChunks = new Set(sections?.map(s => s.document_id) || [])
  const docsWithoutChunks = documents?.filter(d => !docsWithChunks.has(d.id)) || []

  console.log(`\n📊 Documents with chunks: ${docsWithChunks.size}`)
  console.log(`📊 Documents without chunks: ${docsWithoutChunks.length}`)

  if (docsWithoutChunks.length > 0) {
    console.log('\n⚠️  Documents without chunks:')
    docsWithoutChunks.slice(0, 20).forEach(d => {
      console.log(`   - ${d.title} (${d.id})`)
    })
    if (docsWithoutChunks.length > 20) {
      console.log(`   ... and ${docsWithoutChunks.length - 20} more`)
    }
  }

  // 5. Check docs with incomplete chunks
  const docChunkCounts = new Map<string, { expected: number; actual: number }>()

  for (const section of sections || []) {
    if (!docChunkCounts.has(section.document_id)) {
      docChunkCounts.set(section.document_id, { expected: section.chunk_count || 1, actual: 0 })
    }
    const entry = docChunkCounts.get(section.document_id)!
    entry.actual++
    entry.expected = Math.max(entry.expected, section.chunk_count || 1)
  }

  const incompleteDocs: string[] = []
  for (const [docId, counts] of docChunkCounts) {
    if (counts.actual < counts.expected) {
      incompleteDocs.push(docId)
    }
  }

  if (incompleteDocs.length > 0) {
    console.log(`\n⚠️  Documents with incomplete chunks: ${incompleteDocs.length}`)
  }

  // 6. Summary
  console.log('\n========================================')
  console.log('📊 SUMMARY')
  console.log('========================================')
  console.log(`✅ Documents: ${documents?.length || 0}`)
  console.log(`✅ Chunks: ${sections?.length || 0}`)
  console.log(`❌ Duplicates: ${duplicates.length}`)
  console.log(`⚠️  Docs without chunks: ${docsWithoutChunks.length}`)
  console.log(`⚠️  Docs with incomplete chunks: ${incompleteDocs.length}`)
  console.log('========================================\n')

  // Return data for further processing
  return {
    documents: documents || [],
    sections: sections || [],
    duplicates,
    docsWithoutChunks,
    incompleteDocs
  }
}

checkStatus().catch(console.error)