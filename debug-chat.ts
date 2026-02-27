
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)
const geminiKey = process.env.GEMINI_API_KEY || ''

async function generateEmbedding(text: string): Promise<number[]> {
  const input = text.replace(/\n+/g, ' ').trim()
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiKey}`,
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
    const errorText = await response.text()
    throw new Error(`Gemini API Error: ${response.status} ${errorText}`)
  }

  const data: any = await response.json()
  return data.embedding.values
}

async function testSearch() {
  const query = "Làm thế nào để tạo chatbot?"
  const lang = "vi"
  
  console.log("Generating embedding using Gemini...")
  try {
    const embedding = await generateEmbedding(query)
    console.log("Embedding generated. Length:", embedding.length)

    // 2. Search
    console.log("Searching documents...")
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.3,
      match_count: 3,
      filter_lang: lang
    })

    if (error) {
      console.error("Search error:", error)
      return
    }

    console.log(`Found ${data.length} results.`)
    
    // 3. Inspect Content & Fields
    data.forEach((doc: any, i: number) => {
      console.log(`\n--- Result ${i+1} ---`)
      console.log('Full Doc Structure:', JSON.stringify(doc, null, 2))
    })

    if (data.length > 0) {
        // Try to fetch parent documents using document_id if available
        const docIds = data.map((d: any) => d.document_id).filter((id: any) => id)
        if (docIds.length > 0) {
            console.log("\nFetching parent documents for IDs:", docIds)
            const { data: parentDocs, error: parentError } = await supabase
                .from('documents')
                .select('*')
                .in('id', docIds)
            
            if (parentError) {
                console.error("Error fetching parent docs:", parentError)
            } else {
                console.log("Parent Docs found:", parentDocs.length)
                parentDocs.forEach((pd: any) => {
                    console.log(`\n--- Parent Doc ${pd.id} ---`)
                    console.log(`Title: ${pd.title}`)
                    console.log(`URL: ${pd.url}`)
                })
            }
        } else {
            console.log("No document_id found in search results.")
        }
    }
  } catch (err) {
    console.error(err)
  }
}

testSearch()
