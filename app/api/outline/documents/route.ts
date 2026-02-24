// app/api/outline/documents/route.ts
// Fetch documents from Outline

import { NextRequest, NextResponse } from 'next/server'
import { getOutlineDocuments, getOutlineCollections } from '@/lib/outline'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const collectionId = searchParams.get('collectionId')
  const limit = parseInt(searchParams.get('limit') || '10')

  try {
    // If no collectionId provided, list all collections first
    if (!collectionId) {
      const collections = await getOutlineCollections()
      
      // Fetch documents from configured VI and EN collections
      const viCollectionId = process.env.OUTLINE_COLLECTION_VI_ID
      const enCollectionId = process.env.OUTLINE_COLLECTION_EN_ID
      
      const [viDocs, enDocs] = await Promise.all([
        viCollectionId ? getOutlineDocuments(viCollectionId, { limit }) : Promise.resolve([]),
        enCollectionId ? getOutlineDocuments(enCollectionId, { limit }) : Promise.resolve([]),
      ])

      return NextResponse.json({
        collections: collections.map(c => ({
          id: c.id,
          name: c.name,
          urlId: c.urlId,
        })),
        configuredCollections: {
          vi: viCollectionId,
          en: enCollectionId,
        },
        documents: {
          vi: viDocs.map(d => ({
            id: d.id,
            title: d.title,
            urlId: d.urlId,
            url: d.url,
            updatedAt: d.updatedAt,
          })),
          en: enDocs.map(d => ({
            id: d.id,
            title: d.title,
            urlId: d.urlId,
            url: d.url,
            updatedAt: d.updatedAt,
          })),
        },
        totalVi: viDocs.length,
        totalEn: enDocs.length,
      })
    }

    // Fetch from specific collection
    const documents = await getOutlineDocuments(collectionId, { limit })
    
    return NextResponse.json({
      collectionId,
      documents: documents.map(d => ({
        id: d.id,
        title: d.title,
        urlId: d.urlId,
        url: d.url,
        updatedAt: d.updatedAt,
        createdAt: d.createdAt,
        textPreview: d.text?.substring(0, 200) + '...',
      })),
      total: documents.length,
    })
  } catch (error) {
    console.error('Error fetching Outline documents:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}