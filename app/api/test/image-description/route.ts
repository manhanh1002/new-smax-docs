// app/api/test/image-description/route.ts
// Test API for processing document images with Gemini Vision

import { NextRequest, NextResponse } from 'next/server'
import { getOutlineDocuments, searchOutlineDocuments } from '@/lib/outline'
import { 
  processDocumentImages, 
  extractImageUrls, 
  getImageStats,
  type ImageDescription 
} from '@/lib/image-description'
import { generateEmbedding } from '@/lib/embeddings'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const documentTitle = searchParams.get('title') || 'facebook'
  const limit = parseInt(searchParams.get('limit') || '10')
  const saveToDb = searchParams.get('save') === 'true'

  try {
    console.log(`[Test Image Description] Searching for document: "${documentTitle}"`)

    // Search for the document
    const documents = await searchOutlineDocuments(documentTitle)
    
    if (documents.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No document found with title containing "${documentTitle}"`,
        suggestion: 'Try searching with a different keyword'
      }, { status: 404 })
    }

    // Find the best matching document
    const targetDoc = documents.find(d => 
      d.title.toLowerCase().includes(documentTitle.toLowerCase())
    ) || documents[0]

    console.log(`[Test Image Description] Found document: "${targetDoc.title}"`)

    // Extract images from content
    const imageInfos = extractImageUrls(targetDoc.text || '')
    console.log(`[Test Image Description] Found ${imageInfos.length} images`)

    // Return document info without processing if no images
    if (imageInfos.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Document found but has no images',
        document: {
          id: targetDoc.id,
          title: targetDoc.title,
          url: targetDoc.url,
          contentLength: targetDoc.text?.length || 0,
          contentPreview: targetDoc.text?.substring(0, 500)
        },
        images: []
      })
    }

    // Process images
    const startTime = Date.now()
    const { images, enrichedContent } = await processDocumentImages(
      targetDoc.text || '',
      {
        limit,
        documentTitle: targetDoc.title
      }
    )
    const totalProcessingTime = Date.now() - startTime

    // Get statistics
    const stats = getImageStats(images)

    // Save to database if requested
    let embeddingCreated = false
    if (saveToDb) {
      try {
        // Generate embedding for enriched content
        const embedding = await generateEmbedding(enrichedContent.slice(0, 8000))

        // Upsert document to database
        const { error: upsertError } = await supabaseAdmin
          .from('documents')
          .upsert({
            external_id: targetDoc.urlId || targetDoc.id,
            title: targetDoc.title,
            slug: targetDoc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
            language: 'vi',
            path: targetDoc.url || '',
            content: enrichedContent,
            embedding,
            meta: {
              original_content: targetDoc.text,
              image_descriptions: images,
              outline_id: targetDoc.id,
              processed_at: new Date().toISOString()
            },
            last_updated: new Date().toISOString()
          }, { onConflict: 'external_id' })

        if (upsertError) {
          console.error('[Test Image Description] Database error:', upsertError)
        } else {
          embeddingCreated = true
          console.log('[Test Image Description] ✓ Saved to database')
        }
      } catch (dbError) {
        console.error('[Test Image Description] Database error:', dbError)
      }
    }

    return NextResponse.json({
      success: true,
      document: {
        id: targetDoc.id,
        title: targetDoc.title,
        url: targetDoc.url,
        contentLength: targetDoc.text?.length || 0,
        enrichedContentLength: enrichedContent.length
      },
      images: images.map(img => ({
        attachmentId: img.attachmentId,
        altText: img.altText,
        description: img.description,
        error: img.error,
        processingTime: img.processingTime
      })),
      stats: {
        ...stats,
        totalProcessingTime
      },
      enrichedContent: saveToDb ? undefined : enrichedContent, // Only return if not saving
      embeddingCreated,
      savedToDatabase: saveToDb && embeddingCreated
    })

  } catch (error) {
    console.error('[Test Image Description] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { documentId, limit = 10, saveToDb = true } = body

  if (!documentId) {
    return NextResponse.json({
      error: 'documentId is required'
    }, { status: 400 })
  }

  try {
    console.log(`[Test Image Description] Processing document ID: ${documentId}`)

    // Get document from Outline
    const { getOutlineDocument } = await import('@/lib/outline')
    const doc = await getOutlineDocument(documentId)

    if (!doc) {
      return NextResponse.json({
        success: false,
        error: 'Document not found'
      }, { status: 404 })
    }

    // Extract images
    const imageInfos = extractImageUrls(doc.text || '')

    if (imageInfos.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Document has no images',
        document: {
          id: doc.id,
          title: doc.title
        }
      })
    }

    // Process images
    const startTime = Date.now()
    const { images, enrichedContent } = await processDocumentImages(
      doc.text || '',
      {
        limit,
        documentTitle: doc.title
      }
    )
    const totalProcessingTime = Date.now() - startTime

    // Save to database
    let embeddingCreated = false
    if (saveToDb) {
      const embedding = await generateEmbedding(enrichedContent.slice(0, 8000))

      const { error: upsertError } = await supabaseAdmin
        .from('documents')
        .upsert({
          external_id: doc.urlId || doc.id,
          title: doc.title,
          slug: doc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
          language: 'vi',
          path: doc.url || '',
          content: enrichedContent,
          embedding,
          meta: {
            original_content: doc.text,
            image_descriptions: images,
            outline_id: doc.id,
            processed_at: new Date().toISOString()
          },
          last_updated: new Date().toISOString()
        }, { onConflict: 'external_id' })

      if (!upsertError) {
        embeddingCreated = true
      }
    }

    const stats = getImageStats(images)

    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        title: doc.title,
        url: doc.url
      },
      images,
      stats: {
        ...stats,
        totalProcessingTime
      },
      embeddingCreated,
      savedToDatabase: saveToDb && embeddingCreated
    })

  } catch (error) {
    console.error('[Test Image Description] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}