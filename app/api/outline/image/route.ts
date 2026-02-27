import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const attachmentId = searchParams.get("id")
  
  if (!attachmentId) {
    return new NextResponse("Missing attachment ID", { status: 400 })
  }
  
  // Clean up ID: Outline IDs are typically UUIDs or alphanumeric.
  // Sometimes extra characters or whitespace might sneak in.
  const cleanId = attachmentId.trim()
  
  const outlineUrl = process.env.OUTLINE_URL || "https://docs.cdp.vn"
  const apiKey = process.env.OUTLINE_API_KEY
  
  try {
    const targetUrl = `${outlineUrl}/api/attachments.redirect?id=${cleanId}`
    console.log(`[ImageProxy] Fetching: ${targetUrl}`)

    const response = await fetch(
      targetUrl,
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        redirect: "manual", // Don't follow redirects automatically
        cache: "no-store", // CRITICAL: Prevent Next.js/Netlify from caching this request
      }
    )
    
    // If it's a redirect, get the final URL
    if (response.status === 302 || response.status === 301 || response.status === 307 || response.status === 308) {
      let location = response.headers.get("location")
      console.log(`[ImageProxy] Redirect to: ${location}`)
      
      if (location) {
        // Handle relative redirect URL
        if (location.startsWith("/")) {
          location = `${outlineUrl}${location}`
        }

        // Check if redirect is internal (Outline) or external (S3/Cloud)
        const isInternal = location.startsWith(outlineUrl)

        const headers: Record<string, string> = {}
        if (isInternal) {
          headers["Authorization"] = `Bearer ${apiKey}`
        }
        
        // Fetch the actual image
        // We do NOT add Authorization header here because the redirected URL (S3 signed URL)
        // usually includes the signature in the query params and might reject extra headers.
        const imageResponse = await fetch(location, {
            headers,
            cache: "no-store", // Ensure we fetch fresh content
        })

        if (!imageResponse.ok) {
            console.error(`[ImageProxy] Failed to fetch redirected image from ${location}: ${imageResponse.status}`)
            return new NextResponse(`Failed to fetch redirected image: ${imageResponse.status}`, { status: imageResponse.status })
        }

        const imageBuffer = await imageResponse.arrayBuffer()
        
        return new NextResponse(imageBuffer, {
          headers: {
            "Content-Type": imageResponse.headers.get("content-type") || "image/png",
            // Cache in browser/CDN for 1 hour to reduce load, but allow revalidation
            "Cache-Control": "public, max-age=3600, stale-while-revalidate=600",
          },
        })
      }
    }
    
    // If direct response
    if (response.ok) {
      const imageBuffer = await response.arrayBuffer()
      return new NextResponse(imageBuffer, {
        headers: {
          "Content-Type": response.headers.get("content-type") || "image/png",
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=600",
        },
      })
    }
    
    console.error(`[ImageProxy] Outline API Error: ${response.status}`)
    return new NextResponse(`Failed to fetch image: ${response.status}`, { status: response.status })
  } catch (error) {
    console.error("[ImageProxy] Error fetching Outline image:", error)
    return new NextResponse("Error fetching image", { status: 500 })
  }
}