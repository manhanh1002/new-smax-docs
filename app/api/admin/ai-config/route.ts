import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Helper to get authenticated user
async function getUser() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Error when setting cookie is expected if in a server component
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Error when removing cookie
          }
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch config
    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'ai_config')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is not found
      throw error
    }

    const defaultEmpty = { provider: 'token.ai', apiKey: '', model: 'gpt-5-chat', baseURL: 'https://token.ai.vn/v1' }

    return NextResponse.json(data ? data.value : defaultEmpty)
  } catch (error) {
    console.error('Error fetching AI config:', error)
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { provider, apiKey, model, baseURL } = body

    if (!provider || !model) {
      return NextResponse.json({ error: 'Provider and model are required' }, { status: 400 })
    }

    const configValue = {
      provider,
      apiKey: apiKey || '', // Allow empty if they don't want to change or rely on ENV
      model,
      baseURL: baseURL || (provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://token.ai.vn/v1')
    }

    // Upsert into system_settings
    const { error } = await supabaseAdmin
      .from('system_settings')
      .upsert({
        key: 'ai_config',
        value: configValue,
        description: 'Global AI provider and model configuration',
        updated_at: new Date().toISOString(),
        updated_by: user.id
      }, { onConflict: 'key' })

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Configuration saved successfully' })
  } catch (error) {
    console.error('Error saving AI config:', error)
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 })
  }
}
