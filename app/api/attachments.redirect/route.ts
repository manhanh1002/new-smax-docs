
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 })
  }

  // Use process.env.OUTLINE_URL or default
  // Important: Remove trailing slash if present, and ensure /api/attachments.redirect is appended
  const outlineUrl = process.env.OUTLINE_URL || 'https://docs.cdp.vn'
  const targetUrl = `${outlineUrl.replace(/\/$/, '')}/api/attachments.redirect?id=${id}`

  const apiKey = process.env.OUTLINE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Server misconfiguration: Missing API Key' }, { status: 500 })
  }

  // Ensure Bearer prefix
  const authHeader = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`

  try {
    // We don't want to follow redirect automatically, we want to get the Location header
    // But fetch follows redirects by default. 'manual' redirect mode is what we need.
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
      redirect: 'manual'
    })

    // If we get a redirect (301, 302, 307, 308), return the location
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (location) {
        // Redirect the client to the actual signed URL (which is public/signed)
        return NextResponse.redirect(location)
      }
    }

    // If it's not a redirect, maybe it returned the content directly or an error
    if (!response.ok) {
      return NextResponse.json({ error: `Outline API error: ${response.status}` }, { status: response.status })
    }

    // Fallback: pipe the content (if for some reason it's not a redirect)
    // This consumes more bandwidth on our server
    const contentType = response.headers.get('content-type')
    const blob = await response.blob()
    
    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600'
      }
    })

  } catch (error) {
    console.error('Proxy image error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
