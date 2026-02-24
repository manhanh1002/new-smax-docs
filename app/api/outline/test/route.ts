// app/api/outline/test/route.ts
// Test endpoint for Outline connection

import { NextResponse } from 'next/server'
import { testOutlineConnection, getOutlineCollections } from '@/lib/outline'

export async function GET() {
  try {
    // Test basic connection
    const connectionTest = await testOutlineConnection()
    
    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        error: connectionTest.message,
        config: {
          outlineUrl: process.env.OUTLINE_URL || 'not set',
          hasApiKey: !!process.env.OUTLINE_API_KEY,
          hasWebhookSecret: !!process.env.OUTLINE_WEBHOOK_SECRET,
          viCollectionId: process.env.OUTLINE_COLLECTION_VI_ID || 'not set',
          enCollectionId: process.env.OUTLINE_COLLECTION_EN_ID || 'not set',
        }
      }, { status: 400 })
    }

    // Try to fetch collections
    let collections: Awaited<ReturnType<typeof getOutlineCollections>> = []
    try {
      collections = await getOutlineCollections()
    } catch (e) {
      console.warn('Could not fetch collections:', e)
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Outline',
      user: connectionTest.user,
      collections: collections.map(c => ({
        id: c.id,
        name: c.name,
        urlId: c.urlId,
      })),
      config: {
        outlineUrl: process.env.OUTLINE_URL,
        hasApiKey: true,
        hasWebhookSecret: true,
        viCollectionId: process.env.OUTLINE_COLLECTION_VI_ID,
        enCollectionId: process.env.OUTLINE_COLLECTION_EN_ID,
      },
      webhookUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com'}/api/webhooks/outline`,
    })
  } catch (error) {
    console.error('Outline test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}