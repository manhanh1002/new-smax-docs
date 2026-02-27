import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

// Try to load environment variables if they are missing (e.g. running scripts)
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
  } catch (e) {
    // Ignore error if .env.local doesn't exist or dotenv is not available
  }
}

// Check for required environment variables but don't throw immediately
// to allow importing this file in environments where variables might be set later
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl && typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  console.warn('Warning: NEXT_PUBLIC_SUPABASE_URL is missing')
}

if (!supabaseServiceKey && typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  console.warn('Warning: SUPABASE_SERVICE_ROLE_KEY is missing')
}

// Create a single supabase client for interacting with your database
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder'
)
