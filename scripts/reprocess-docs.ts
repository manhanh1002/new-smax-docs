
import { createClient } from '@supabase/supabase-js'
import { generateEmbedding, splitTextIntoChunks } from '../lib/embeddings'
import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function reprocessDocuments() {
  console.log('Starting document reprocessing...')
  
  // 1. Get all documents
  const { data: documents, error } = await supabaseAdmin
    .from('documents')
    .select('*')
  
  if (error) {
    console.error('Error fetching documents:', error)
    return
  }
  
  console.log(`Found ${documents.length} documents to process`)
  
  // 2. Process each document
  for (const doc of documents) {
    console.log(`Processing document: ${doc.title} (${doc.id})`)
    
    try {
      // 2.1 Delete existing sections for this document
      const { error: deleteError } = await supabaseAdmin
        .from('document_sections')
        .delete()
        .eq('document_id', doc.id)
      
      if (deleteError) {
        console.error(`Error deleting sections for ${doc.id}:`, deleteError)
        continue
      }
      
      // 2.2 Split content into chunks
      const chunks = splitTextIntoChunks(doc.content)
      console.log(`  Split into ${chunks.length} chunks`)
      
      // 2.3 Generate embeddings and save sections
      let successCount = 0
      
      for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i]
        
        try {
          // Generate embedding (now using gemini-embedding-001 via REST v1beta)
          const embedding = await generateEmbedding(chunkContent)
          
          // Save to database
          const { error: insertError } = await supabaseAdmin
            .from('document_sections')
            .insert({
              document_id: doc.id,
              content: chunkContent,
              embedding: embedding,
              chunk_index: i,
              chunk_count: chunks.length,
              token_count: chunkContent.length // Approximate
            })
          
          if (insertError) {
            console.error(`  Error saving chunk ${i}:`, insertError)
          } else {
            successCount++
          }
          
          // Rate limiting pause (avoid hitting API limits)
          await new Promise(resolve => setTimeout(resolve, 500))
          
        } catch (embedError) {
          console.error(`  Error generating embedding for chunk ${i}:`, embedError)
        }
      }
      
      console.log(`  Successfully processed ${successCount}/${chunks.length} chunks`)
      
    } catch (docError) {
      console.error(`Error processing document ${doc.id}:`, docError)
    }
  }
  
  console.log('Reprocessing complete!')
}

reprocessDocuments().catch(console.error)
