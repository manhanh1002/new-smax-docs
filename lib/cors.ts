// lib/cors.ts
// CORS headers for API routes

import { NextResponse } from 'next/server'

export const ALLOWED_ORIGINS = [
  'https://smax.ai',
  'https://www.smax.ai',
  'https://dev.smax.ai',
  'https://biz.smax.ai',
  'https://admin.smax.ai',
  'https://cdp.vn',
  'https://bot.vn',
  'https://tailieu.smax.ai',
  'http://localhost:3000',
  'http://localhost:4000',
]

export function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }

  // Restrict to allowed origins
  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.smax.ai'))) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
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