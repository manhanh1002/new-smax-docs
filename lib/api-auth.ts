import { NextRequest } from 'next/server'
import { ALLOWED_ORIGINS, corsHeaders } from './cors'
import { supabaseAdmin } from './supabase-admin'

const SYSTEM_KEY_ID = '00000000-0000-0000-0000-000000000000'

/**
 * Verifies if the request is authorized to access the API.
 * Authorization is granted if:
 * 1. The request comes from a whitelisted origin (e.g., *.smax.ai, *.cdp.vn, *.vercel.app)
 * 2. The request includes a valid x-api-key header matching the one in the database.
 */
export async function verifyApiAccess(req: NextRequest): Promise<boolean> {
  const origin = req.headers.get('origin')
  const apiKeyHeader = req.headers.get('x-api-key')
  const host = req.headers.get('host')
  const referer = req.headers.get('referer')

  console.log(`[Auth] Checking access - Origin: ${origin}, Host: ${host}`)

  // 1. Check Origin whitelist
  if (origin && (
    ALLOWED_ORIGINS.includes(origin) || 
    origin.endsWith('.smax.ai') || 
    origin.endsWith('.cdp.vn') ||
    origin.endsWith('.vercel.app')
  )) {
    return true
  }

  // 2. Fallback: Check Host for same-origin requests (Origin header might be missing)
  if (host && (
    host.includes('localhost') || 
    host.includes('127.0.0.1') ||
    host.endsWith('smax.ai') || 
    host.endsWith('cdp.vn') ||
    host.endsWith('netlify.app') ||
    host.endsWith('vercel.app')
  )) {
    return true
  }

  // 3. Check x-api-key header
  // As requested: "nếu nó gọi kèm theo x-api-key cũng đồng ý luôn"
  if (!apiKeyHeader) return false

  try {
    // Fetch the current system API key from Supabase
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('content')
      .eq('id', SYSTEM_KEY_ID)
      .single()

    if (!error && data && apiKeyHeader === data.content) {
      return true
    }
  } catch (e) {
    console.error('Error verifying API Key:', e)
  }

  return false
}

/**
 * Standard unauthorized response for API routes
 */
export function unauthorizedResponse(origin: string | null) {
  return new Response(JSON.stringify({ 
    error: 'Unauthorized. Use an allowed origin or provide a valid x-api-key header.' 
  }), {
    status: 401,
    headers: { 
      'Content-Type': 'application/json',
      ...corsHeaders(origin)
    }
  })
}
