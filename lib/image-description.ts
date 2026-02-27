// lib/image-description.ts
// Handles image extraction and description generation using Google Gemini 2.5 Flash Vision

import { GoogleGenerativeAI } from '@google/generative-ai'

// Configure Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Use Gemini 2.5 Flash for vision tasks
const VISION_MODEL = 'gemini-2.0-flash'

const OUTLINE_URL = process.env.OUTLINE_URL || 'https://docs.cdp.vn'
const OUTLINE_API_KEY = process.env.OUTLINE_API_KEY || ''

export interface ImageInfo {
  attachmentId: string
  altText: string
  fullMatch: string
}

export interface ImageDescription {
  attachmentId: string
  altText: string
  description: string
  error?: string
  processingTime?: number
}

/**
 * Extract image URLs from markdown content
 * Matches patterns like: ![alt text](attachment-id) or ![alt text](https://...)
 * Also handles Outline's format: ![](/api/attachments.redirect?id=xxx " =widthxheight")
 */
export function extractImageUrls(markdown: string): ImageInfo[] {
  // Match markdown image syntax: ![alt text](url "optional title")
  // The URL can be followed by an optional title in quotes
  const regex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
  const matches = [...markdown.matchAll(regex)]
  
  return matches.map(match => {
    let attachmentId = match[2]
    
    // Extract just the ID from Outline's attachment URL format
    // /api/attachments.redirect?id=xxx -> xxx
    const idMatch = attachmentId.match(/[?&]id=([a-f0-9-]+)/i)
    if (idMatch) {
      attachmentId = idMatch[1]
    }
    
    return {
      attachmentId, // The clean attachment ID
      altText: match[1] || '', // The alt text
      fullMatch: match[0] // The full match
    }
  })
}

/**
 * Download image from Outline attachment
 */
export async function downloadImageFromOutline(attachmentId: string): Promise<{ buffer: Buffer; mimeType: string }> {
  try {
    // First, try to get the redirect URL
    const response = await fetch(
      `${OUTLINE_URL}/api/attachments.redirect?id=${attachmentId}`,
      {
        headers: {
          'Authorization': `Bearer ${OUTLINE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        redirect: 'manual', // Don't follow redirects automatically
      }
    )

    let imageResponse: Response
    let finalMimeType = 'image/png'

    // If it's a redirect, get the final URL
    if (response.status === 302 || response.status === 301) {
      const location = response.headers.get('location')
      if (location) {
        imageResponse = await fetch(location)
        finalMimeType = imageResponse.headers.get('content-type') || 'image/png'
      } else {
        throw new Error('No redirect location found')
      }
    } else if (response.ok) {
      imageResponse = response
      finalMimeType = response.headers.get('content-type') || 'image/png'
    } else {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }

    // Get the image buffer
    const arrayBuffer = await imageResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    return { buffer, mimeType: finalMimeType }
  } catch (error) {
    console.error(`Error downloading image ${attachmentId}:`, error)
    throw error
  }
}

/**
 * Describe image using Gemini 2.5 Flash Vision
 */
export async function describeImageWithGemini(
  imageBuffer: Buffer,
  mimeType: string,
  context?: string
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: VISION_MODEL })

    const prompt = `Bạn là chuyên gia phân tích hình ảnh trong tài liệu hướng dẫn sử dụng phần mềm SmaxAI.

${context ? `Context của tài liệu: ${context}` : ''}

Hãy phân tích và mô tả chi tiết hình ảnh này. Tập trung vào:

1. **Nội dung chính**: Những gì hiển thị trong hình ảnh (giao diện, menu, form, nút bấm, etc.)
2. **Các thành phần quan trọng**: Liệt kê các nút bấm, menu, input fields, labels có trong ảnh
3. **Thông tin hữu ích**: Những thông tin người dùng cần biết khi tìm kiếm hướng dẫn

Lưu ý:
- Nếu là screenshot giao diện, mô tả rõ các bước hoặc tùy chọn có thể thực hiện
- Nếu có text trong ảnh, trích dẫn các từ khóa quan trọng
- Trả lời bằng tiếng Việt, ngắn gọn nhưng đầy đủ thông tin

Định dạng trả lời:
- Dùng gạch đầu dòng cho các danh sách
- In đậm các từ khóa quan trọng
- Không cần tiêu đề, đi thẳng vào nội dung mô tả`

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: imageBuffer.toString('base64')
        }
      }
    ])

    return result.response.text()
  } catch (error) {
    console.error('Error describing image with Gemini:', error)
    throw error
  }
}

/**
 * Process all images in a document and generate descriptions
 */
export async function processDocumentImages(
  content: string,
  options: {
    limit?: number
    documentTitle?: string
    onProgress?: (current: number, total: number, attachmentId: string) => void
  } = {}
): Promise<{ images: ImageDescription[]; enrichedContent: string }> {
  const { limit = 10, documentTitle, onProgress } = options

  // Extract all images
  const imageInfos = extractImageUrls(content)
  const imagesToProcess = imageInfos.slice(0, limit)

  console.log(`[Image Description] Found ${imageInfos.length} images, processing ${imagesToProcess.length}`)

  const imageDescriptions: ImageDescription[] = []

  // Process each image
  for (let i = 0; i < imagesToProcess.length; i++) {
    const img = imagesToProcess[i]
    
    if (onProgress) {
      onProgress(i + 1, imagesToProcess.length, img.attachmentId)
    }

    const startTime = Date.now()

    try {
      console.log(`[Image Description] Processing image ${i + 1}/${imagesToProcess.length}: ${img.attachmentId}`)

      // Download image
      const { buffer, mimeType } = await downloadImageFromOutline(img.attachmentId)

      // Describe with Gemini
      const description = await describeImageWithGemini(buffer, mimeType, documentTitle)

      imageDescriptions.push({
        attachmentId: img.attachmentId,
        altText: img.altText,
        description,
        processingTime: Date.now() - startTime
      })

      console.log(`[Image Description] ✓ Completed in ${Date.now() - startTime}ms`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[Image Description] ✗ Failed: ${errorMsg}`)
      
      imageDescriptions.push({
        attachmentId: img.attachmentId,
        altText: img.altText,
        description: '',
        error: errorMsg,
        processingTime: Date.now() - startTime
      })
    }

    // Add a small delay between API calls to avoid rate limiting
    if (i < imagesToProcess.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  // Enrich content with image descriptions
  let enrichedContent = content
  for (let i = 0; i < imageDescriptions.length; i++) {
    const img = imageDescriptions[i]
    if (img.description && !img.error) {
      // Use the fullMatch from extraction to replace correctly
      const originalMarkdown = imageInfos[i].fullMatch
      const enrichedMarkdown = `${originalMarkdown}\n\n[📷 **Mô tả ảnh**: ${img.description}]`
      enrichedContent = enrichedContent.replace(originalMarkdown, enrichedMarkdown)
    }
  }

  return { images: imageDescriptions, enrichedContent }
}

/**
 * Get image description statistics
 */
export function getImageStats(images: ImageDescription[]): {
  total: number
  success: number
  failed: number
  totalTime: number
} {
  return {
    total: images.length,
    success: images.filter(i => !i.error).length,
    failed: images.filter(i => i.error).length,
    totalTime: images.reduce((sum, i) => sum + (i.processingTime || 0), 0)
  }
}