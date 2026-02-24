# Phase 1: Prerequisites & Setup

## Required Accounts

- [ ] Vercel account with project deployed
- [ ] Supabase account (free tier works)
- [ ] Upstash account (for Vector database)

## Required Dependencies

\`\`\`bash
npm install @supabase/supabase-js @supabase/ssr @upstash/vector ai
\`\`\`

## Environment Variables

Add these to your Vercel project (Settings → Environment Variables):

\`\`\`env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Upstash Vector
UPSTASH_VECTOR_REST_URL=your_vector_url
UPSTASH_VECTOR_REST_TOKEN=your_vector_token

# Ingestion Security (generate a random string)
INGEST_SECRET_KEY=your_secret_key

# App URL
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
\`\`\`

## Getting Your Keys

### Supabase
1. Go to [supabase.com](https://supabase.com) → Create project
2. Settings → API → Copy Project URL and anon key
3. Settings → API → Copy service_role key (keep secret!)

### Upstash Vector
1. Go to [console.upstash.com](https://console.upstash.com)
2. Create Vector Database
3. Copy REST URL and REST Token

## Next Step

→ [Phase 2: Supabase Configuration](./02-supabase-setup.md)
