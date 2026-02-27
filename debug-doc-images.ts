
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function inspectDoc() {
  // Use slug for "Tạo chatbot đầu tiên"
  const slug = '7-tao-chatbot-dau-tien-6weSUJRHTM'
  const id = 'ac0fe8d1-3c9f-4055-9377-9478e6a73a60' // From previous debug

  console.log(`Fetching doc ${id}...`)
  
  // 1. Fetch from Supabase
  const { data: docs, error } = await supabase
    .from('documents')
    .select('*')
    .ilike('title', '%Tạo chatbot đầu tiên%') // Try searching by title
    
  if (error) {
    console.error("Supabase Error:", error)
    return
  }

  if (docs.length === 0) {
      console.log("No doc found.")
      return
  }

  const doc = docs[0]
  console.log("Supabase Doc Title:", doc.title)
  console.log("Supabase Doc ID:", doc.id)
  console.log("Supabase Doc URL:", doc.url)
  
  // Extract image links
  // The 'documents' table in supabase might not have 'text' column if it was migrated differently.
  // It might be 'content' or maybe it's in 'document_sections'
  console.log("Doc keys:", Object.keys(doc))
  
  const content = doc.text || doc.content || ''
  
  const matches = [...content.matchAll(/!\[.*?\]\((.*?)\)/g)]
  console.log(`\nFound ${matches.length} images in markdown:`)
  matches.forEach((m, i) => {
    console.log(`[${i+1}] ${m[1]}`)
  })
}

inspectDoc()
