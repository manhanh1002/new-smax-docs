import { NextRequest, NextResponse } from 'next/server'
import { searchDocs } from '@/lib/docs/service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, lang = 'vi' } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Query is required',
      }, { status: 400 })
    }

    const results = await searchDocs(query, lang)

    return NextResponse.json({
      success: true,
      results: results.map(doc => ({
        id: doc.id,
        title: doc.title,
        slug: doc.slug,
        description: doc.description,
        href: `/${lang}/${doc.slug}`,
        lastUpdated: doc.last_updated,
      })),
      count: results.length,
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({
      success: false,
      error: 'Search failed',
    }, { status: 500 })
  }
}