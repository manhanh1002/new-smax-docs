import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
}

// Note: SUPABASE_SERVICE_ROLE_KEY is required for backend operations that bypass RLS
// We don't throw immediately if it's missing during build time, but it will fail at runtime if not provided
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey || 'placeholder-key-for-build',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
