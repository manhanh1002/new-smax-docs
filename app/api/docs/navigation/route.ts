// app/api/docs/navigation/route.ts
// API endpoint for fetching navigation tree from database

import { NextRequest, NextResponse } from 'next/server'
import { getDocTree, type DocTreeNode } from '@/lib/docs/service'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const lang = (searchParams.get('lang') || 'vi') as 'vi' | 'en'

  try {
    const tree = await getDocTree(lang)
    
    return NextResponse.json({
      success: true,
      navigation: tree,
    })
  } catch (error) {
    console.error('Error fetching navigation:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}