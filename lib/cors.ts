// lib/cors.ts
// CORS headers for API routes

import { NextResponse } from 'next/server'

const ALLOWED_ORIGINS = [
  'https://smax.ai',
  'https://www.smax.ai',
  'https://smax.ai',
  'https://biz.smax.ai',
  'https://docs.cdp.vn',
  'http://localhost:3000',
  'http://localhost:3001',
]

export function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }

  // ALLOW ALL ORIGINS for public widget access
  // In a stricter environment, we could check a whitelist or API key
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
  } else {
    headers['Access-Control-Allow-Origin'] = '*'
  }

  return headers
}

export function handleCorsPreflightRequest(origin: string | null): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin)
  })
}

export function withCors(response: NextResponse, origin: string | null): NextResponse {
  const headers = corsHeaders(origin)
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}