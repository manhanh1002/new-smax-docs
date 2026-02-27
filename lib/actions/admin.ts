
'use server'

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// Helper to get supabase client
async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      global: {
        headers: {
          Authorization: `Basic ${process.env.NEXT_PUBLIC_SUPABASE_BASIC_AUTH}`,
        },
      },
    }
  )
}

// --- TRACKING ACTIONS ---

export async function trackDocRating(slug: string, rating: number, type: 'helpful' | 'easy') {
  const supabase = await getSupabase()
  
  // Get user if logged in (optional)
  const { data: { user } } = await supabase.auth.getUser()

  // First try to find an existing rating for this user/session and slug today to update it
  // But for simplicity and since we don't have session IDs easily here without auth,
  // we just insert a new row. The aggregation logic handles this.
  // Ideally: use upsert with a composite key or session ID.

  const { error } = await supabase.from('doc_ratings').insert({
    slug,
    rating, // Keep legacy column for now or use as 'helpful' default
    helpful_score: type === 'helpful' ? rating : null,
    easy_score: type === 'easy' ? rating : null,
    user_id: user?.id || null
  })

  if (error) {
    console.error('Error tracking rating:', error)
  }
}

export async function trackAnalyticsEvent(eventType: 'ai_chat' | 'copy_page' | 'share_page' | 'view_doc', details: any) {
  const supabase = await getSupabase()
  
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from('analytics_events').insert({
    event_type: eventType,
    details,
    user_id: user?.id || null
  })

  if (error) {
    console.error('Error tracking event:', error)
  }
}

// --- ADMIN DATA FETCHING ACTIONS ---

export async function getDashboardStats() {
  const supabase = await getSupabase()

  // Verify Admin (Optional: add strict check here if needed, but Page protection is usually enough)
  
  // 1. Total Docs (from documents table)
  const { count: totalDocs } = await supabase.from('documents').select('*', { count: 'exact', head: true })

  // 2. Total Ratings
  const { count: totalRatings } = await supabase.from('doc_ratings').select('*', { count: 'exact', head: true })

  // 3. Average Rating
  const { data: avgRatingData } = await supabase.from('doc_ratings').select('rating')
  const avgRating = avgRatingData?.length 
    ? (avgRatingData.reduce((acc, curr) => acc + curr.rating, 0) / avgRatingData.length).toFixed(1) 
    : 0

  // 4. Events Today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { count: eventsToday } = await supabase
    .from('analytics_events')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString())

  // 5. Total Views Today
  const { count: viewsToday } = await supabase
    .from('analytics_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'view_doc')
    .gte('created_at', today.toISOString())

  return {
    totalDocs: totalDocs || 0,
    totalRatings: totalRatings || 0,
    avgRating,
    eventsToday: eventsToday || 0,
    viewsToday: viewsToday || 0
  }
}

export async function getRatingStats() {
  const supabase = await getSupabase()
  
  // Fetch all ratings
  const { data: ratings } = await supabase
    .from('doc_ratings')
    .select('slug, rating, helpful_score, easy_score, created_at')
    .order('created_at', { ascending: false })

  // Fetch document titles
  // We need to fetch all docs to map slugs to titles
  const { data: docs } = await supabase.from('documents').select('title, urlId')
  const titleMap = (docs || []).reduce((acc: any, doc) => {
    // Map both full slug and potential urlId
    acc[doc.urlId] = doc.title
    // Also try to match if slug contains the urlId
    return acc
  }, {})

  const grouped = (ratings || []).reduce((acc: any, curr) => {
    if (!acc[curr.slug]) {
      acc[curr.slug] = { 
        slug: curr.slug, 
        title: titleMap[curr.slug] || curr.slug, // Fallback to slug if title not found
        total: 0, 
        helpfulSum: 0, 
        helpfulCount: 0,
        easySum: 0, 
        easyCount: 0,
        lastRated: curr.created_at 
      }
    }
    
    // Count user interaction (one row = one interaction part)
    // But ideally we should group by user/session to count unique raters
    // For simplicity, we count total rows as "interactions"
    acc[curr.slug].total += 1

    if (curr.helpful_score) {
      acc[curr.slug].helpfulSum += curr.helpful_score
      acc[curr.slug].helpfulCount += 1
    }
    
    if (curr.easy_score) {
      acc[curr.slug].easySum += curr.easy_score
      acc[curr.slug].easyCount += 1
    }

    // Legacy fallback
    if (!curr.helpful_score && !curr.easy_score && curr.rating) {
       acc[curr.slug].helpfulSum += curr.rating
       acc[curr.slug].helpfulCount += 1
    }

    // Update last rated if newer
    if (new Date(curr.created_at) > new Date(acc[curr.slug].lastRated)) {
      acc[curr.slug].lastRated = curr.created_at
    }
    return acc
  }, {})

  const result = Object.values(grouped).map((item: any) => ({
    ...item,
    avgHelpful: item.helpfulCount ? (item.helpfulSum / item.helpfulCount).toFixed(1) : "N/A",
    avgEasy: item.easyCount ? (item.easySum / item.easyCount).toFixed(1) : "N/A",
    // Total raters estimate (max of either count)
    totalRaters: Math.max(item.helpfulCount, item.easyCount)
  })).sort((a: any, b: any) => b.totalRaters - a.totalRaters)

  return result
}

export async function getAnalyticsData() {
  const supabase = await getSupabase()

  // 1. Event Type Distribution
  const { data: allEvents } = await supabase
    .from('analytics_events')
    .select('event_type, created_at')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

  // Group by date and type for charts
  // Format: { date: '2023-10-01', ai_chat: 10, copy_page: 5, share_page: 2 }
  
  const chartDataMap: any = {}
  
  allEvents?.forEach(event => {
    const date = new Date(event.created_at).toLocaleDateString('en-CA') // YYYY-MM-DD
    if (!chartDataMap[date]) {
      chartDataMap[date] = { date, ai_chat: 0, copy_page: 0, share_page: 0, view_doc: 0 }
    }
    if (chartDataMap[date][event.event_type] !== undefined) {
      chartDataMap[date][event.event_type] += 1
    }
  })

  const chartData = Object.values(chartDataMap).sort((a: any, b: any) => a.date.localeCompare(b.date))

  // Summary by type
  const summary = allEvents?.reduce((acc: any, curr) => {
    acc[curr.event_type] = (acc[curr.event_type] || 0) + 1
    return acc
  }, { ai_chat: 0, copy_page: 0, share_page: 0, view_doc: 0 })

  return { chartData, summary }
}
