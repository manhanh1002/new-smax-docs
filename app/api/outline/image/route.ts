import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const attachmentId = searchParams.get("id")
  
  if (!attachmentId) {
    return new NextResponse("Missing attachment ID", { status: 400 })
  }
  
  const outlineUrl = process.env.OUTLINE_URL || "https://docs.cdp.vn"
  const apiKey = process.env.OUTLINE_API_KEY
  
  try {
    const response = await fetch(
      `${outlineUrl}/api/attachments.redirect?id=${attachmentId}`,
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        redirect: "manual", // Don't follow redirects automatically
      }
    )
    
    // If it's a redirect, get the final URL
    if (response.status === 302 || response.status === 301) {
      const location = response.headers.get("location")
      if (location) {
        // Fetch the actual image
        const imageResponse = await fetch(location)
        const imageBuffer = await imageResponse.arrayBuffer()
        
        return new NextResponse(imageBuffer, {
          headers: {
            "Content-Type": imageResponse.headers.get("content-type") || "image/png",
            "Cache-Control": "public, max-age=86400", // Cache for 1 day
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
          "Cache-Control": "public, max-age=86400",
        },
      })
    }
    
    return new NextResponse(`Failed to fetch image: ${response.status}`, { status: response.status })
  } catch (error) {
    console.error("Error fetching Outline image:", error)
    return new NextResponse("Error fetching image", { status: 500 })
  }
}