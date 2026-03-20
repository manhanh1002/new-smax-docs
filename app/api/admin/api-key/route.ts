import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const SYSTEM_KEY_ID = '00000000-0000-0000-0000-000000000000'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('content')
      .eq('id', SYSTEM_KEY_ID)
      .single()

    if (error || !data) {
      return NextResponse.json({ apiKey: null })
    }

    return NextResponse.json({ apiKey: data.content })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch API key' }, { status: 500 })
  }
}

export async function POST() {
  try {
    // Generate a random 32-character API key
    const newApiKey = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 32)

    const { error } = await supabaseAdmin
      .from('documents')
      .upsert({
        id: SYSTEM_KEY_ID,
        title: 'SYSTEM_API_KEY',
        content: newApiKey,
        slug: 'system-api-key',
        language: 'vi',
        path: '/internal/api-key',
        last_updated: new Date().toISOString()
      })

    if (error) {
      throw error
    }

    return NextResponse.json({ apiKey: newApiKey })
  } catch (error) {
    console.error('Error generating API key:', error)
    return NextResponse.json({ error: 'Failed to generate API key' }, { status: 500 })
  }
}
