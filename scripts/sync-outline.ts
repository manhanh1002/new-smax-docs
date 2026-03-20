
import { createClient } from '@supabase/supabase-js'
import { getOutlineDocuments, type OutlineDocument } from '../lib/outline'
import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

if (!process.env.OUTLINE_API_KEY || !process.env.OUTLINE_URL) {
  console.error('Missing Outline credentials')
  process.exit(1)
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function syncOutlineDocs() {
  console.log('Starting sync from Outline...')
  
  try {
    // Note: Pagination handled by getOutlineDocuments, boost limit to catch everything
    const outlineDocs = await getOutlineDocuments(undefined, { limit: 500 })
    console.log(`Found ${outlineDocs.length} documents on Outline`)
    
    if (outlineDocs.length === 0) {
      console.log('No documents found to sync.')
      return
    }

    // 2. Get existing documents in Supabase to compare
    const { data: existingDocs, error: existingError } = await supabaseAdmin
      .from('documents')
      .select('id, external_id, title')
    
    if (existingError) {
      throw new Error(`Error checking existing docs: ${existingError.message}`)
    }
    
    const existingIds = new Set(existingDocs?.map(d => d.id) || [])
    const existingTitles = new Set(existingDocs?.map(d => d.title) || [])
    
    console.log(`Found ${existingIds.size} existing documents in Supabase`)

    // 3. Filter new or updated documents
    // For simplicity, we'll sync everything that matches ID or Title to ensure content is fresh
    // But primarily we want to find the missing "Zalo" docs
    
    let syncedCount = 0
    let errorCount = 0
    
    for (const doc of outlineDocs) {
      const isExisting = existingIds.has(doc.id)
      const isTitleMatch = existingTitles.has(doc.title)
      
      console.log(`Syncing: ${doc.title} (${doc.id}) - ${isExisting ? 'Update' : 'New'}`)
      
      const docData = {
        id: doc.id,
        external_id: doc.urlId || doc.id,
        title: doc.title,
        slug: doc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        // Determine language based on collection ID (simple mapping)
        language: doc.collectionId === process.env.OUTLINE_COLLECTION_EN_ID ? 'en' : 'vi',
        path: doc.url || '',
        content: doc.text || '',
        meta: {
          outline_url: doc.url,
          collection_id: doc.collectionId,
          parent_document_id: doc.parentDocumentId,
          published_at: doc.publishedAt,
          outline_created_at: doc.createdAt,
          outline_updated_at: doc.updatedAt,
        },
        last_updated: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
      }

      // Upsert document
      const { error: upsertError } = await supabaseAdmin
        .from('documents')
        .upsert(docData)
        
      if (upsertError) {
        console.error(`  Error syncing ${doc.title}:`, upsertError.message)
        errorCount++
      } else {
        syncedCount++
      }
    }
    
    console.log(`Sync complete. Synced: ${syncedCount}, Errors: ${errorCount}`)
    
  } catch (error) {
    console.error('Sync failed:', error)
  }
}

syncOutlineDocs().catch(console.error)
