// app/api/debug/database/route.ts
// Debug endpoint to check database status

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getOutlineDocuments, type OutlineDocument } from '@/lib/outline'

export async function GET() {
  try {
    // Get documents from Supabase
    const { data: supabaseDocs, error: supabaseError } = await supabaseAdmin
      .from('documents')
      .select('id, title, language, embedding')
    
    if (supabaseError) {
      return NextResponse.json({ error: supabaseError.message }, { status: 500 })
    }

    // Get documents from Outline
    let outlineDocs: OutlineDocument[] = []
    try {
      outlineDocs = await getOutlineDocuments(undefined, { limit: 100 })
    } catch (e) {
      console.error('Could not fetch from Outline:', e)
    }

    // Count embeddings
    const withEmbedding = supabaseDocs?.filter(d => d.embedding !== null).length || 0
    const withoutEmbedding = supabaseDocs?.filter(d => d.embedding === null).length || 0

    // Compare
    const supabaseIds = new Set(supabaseDocs?.map(d => d.id) || [])
    const outlineIds = new Set(outlineDocs.map(d => d.id))
    
    const missingInSupabase = outlineDocs.filter(d => !supabaseIds.has(d.id))
    const extraInSupabase = supabaseDocs?.filter(d => !outlineIds.has(d.id)) || []

    return NextResponse.json({
      supabase: {
        total: supabaseDocs?.length || 0,
        withEmbedding,
        withoutEmbedding,
        byLanguage: {
          vi: supabaseDocs?.filter(d => d.language === 'vi').length || 0,
          en: supabaseDocs?.filter(d => d.language === 'en').length || 0,
        }
      },
      outline: {
        total: outlineDocs.length
      },
      comparison: {
        missingInSupabase: missingInSupabase.length,
        missingInSupabaseTitles: missingInSupabase.slice(0, 10).map(d => d.title),
        extraInSupabase: extraInSupabase.length
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}