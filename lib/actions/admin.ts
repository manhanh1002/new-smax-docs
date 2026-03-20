
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

// --- DASHBOARD CHARTS DATA ---

export type RatingTrendPoint = {
  date: string
  helpful: number
  easy: number
}

export type TopDoc = {
  slug: string
  title: string
  avgHelpful: number
  avgEasy: number
  totalRaters: number
  totalRatings: number
}

export type FunnelStep = {
  name: string
  value: number
  fill: string
  _raw: number
}

export type InsightStat = {
  totalEvents: number
  totalRatings: number
  avgHelpful: number
  avgEasy: number
  topDay: string
  topDayCount: number
  weekOverWeek: number // % change vs previous week
}

/**
 * getRatingTrendData — Last 14 days of daily rating counts, split by type.
 * Used by: RecentActivityChart (AreaChart)
 */
export async function getRatingTrendData(): Promise<RatingTrendPoint[]> {
  const supabase = await getSupabase()
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('doc_ratings')
    .select('helpful_score, easy_score, created_at')
    .gte('created_at', since)

  const map: Record<string, RatingTrendPoint> = {}

  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toLocaleDateString('en-CA') // YYYY-MM-DD
    map[key] = { date: key, helpful: 0, easy: 0 }
  }

  data?.forEach(row => {
    const key = new Date(row.created_at).toLocaleDateString('en-CA')
    if (!map[key]) return
    if (row.helpful_score) map[key].helpful++
    if (row.easy_score) map[key].easy++
  })

  return Object.values(map)
}

/**
 * getTopRatedDocs — Top N docs by rating volume, with scores.
 * Used by: PopularArticlesChart (HorizontalBarChart)
 */
export async function getTopRatedDocs(n = 5): Promise<TopDoc[]> {
  const supabase = await getSupabase()

  const { data: docs } = await supabase.from('documents').select('title, urlId')
  const titleMap: Record<string, string> = {}
  docs?.forEach(d => { titleMap[d.urlId] = d.title })

  const { data } = await supabase
    .from('doc_ratings')
    .select('slug, helpful_score, easy_score')

  const grouped: Record<string, {
    slug: string
    helpfulSum: number
    helpfulCount: number
    easySum: number
    easyCount: number
    total: number
  }> = {}

  data?.forEach(row => {
    if (!grouped[row.slug]) {
      grouped[row.slug] = { slug: row.slug, helpfulSum: 0, helpfulCount: 0, easySum: 0, easyCount: 0, total: 0 }
    }
    grouped[row.slug].total++
    if (row.helpful_score) {
      grouped[row.slug].helpfulSum += row.helpful_score
      grouped[row.slug].helpfulCount++
    }
    if (row.easy_score) {
      grouped[row.slug].easySum += row.easy_score
      grouped[row.slug].easyCount++
    }
  })

  return Object.values(grouped)
    .sort((a, b) => b.total - a.total)
    .slice(0, n)
    .map(item => ({
      slug: item.slug,
      title: titleMap[item.slug] || item.slug,
      avgHelpful: item.helpfulCount ? +(item.helpfulSum / item.helpfulCount).toFixed(1) : 0,
      avgEasy: item.easyCount ? +(item.easySum / item.easyCount).toFixed(1) : 0,
      totalRaters: Math.max(item.helpfulCount, item.easyCount),
      totalRatings: item.total,
    }))
}

/**
 * getEngagementFunnel — view_doc → copy → share → chat conversion funnel.
 * Used by: EngagementFunnelChart
 */
export async function getEngagementFunnel(): Promise<FunnelStep[]> {
  const supabase = await getSupabase()
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('analytics_events')
    .select('event_type')
    .gte('created_at', since)

  const counts: Record<string, number> = {
    view_doc: 0,
    copy_page: 0,
    share_page: 0,
    ai_chat: 0,
  }
  data?.forEach(row => {
    if (row.event_type in counts) counts[row.event_type]++
  })

  const max = Math.max(...Object.values(counts), 1)

  return [
    { key: 'view_doc',  name: 'Xem bài viết',  value: counts.view_doc,  fill: '#8884d8' },
    { key: 'copy_page', name: 'Copy nội dung', value: counts.copy_page, fill: '#82ca9d' },
    { key: 'share_page', name: 'Chia sẻ',     value: counts.share_page, fill: '#ffc658' },
    { key: 'ai_chat',  name: 'Chat AI',       value: counts.ai_chat,   fill: '#ff8042' },
  ].map(step => ({
    name: step.name,
    value: max > 0 ? Math.round((step.value / max) * 100) : 0,
    fill: step.fill,
    _raw: counts[step.key as keyof typeof counts] ?? 0,
  }))
}

/**
 * getInsightsStats — Summary stats for the Insights page.
 * Includes week-over-week delta.
 */
export async function getInsightsStats(): Promise<InsightStat> {
  const supabase = await getSupabase()
  const now = Date.now()
  const ms30 = 30 * 24 * 60 * 60 * 1000
  const ms14 = 14 * 24 * 60 * 60 * 1000
  const ms7  = 7  * 24 * 60 * 60 * 1000

  const [events30, events14, events7, ratings30] = await Promise.all([
    supabase.from('analytics_events').select('event_type, created_at').gte('created_at', new Date(now - ms30).toISOString()),
    supabase.from('analytics_events').select('event_type, created_at').gte('created_at', new Date(now - ms14).toISOString()),
    supabase.from('analytics_events').select('event_type, created_at').gte('created_at', new Date(now - ms7).toISOString()),
    supabase.from('doc_ratings').select('helpful_score, easy_score, created_at').gte('created_at', new Date(now - ms30).toISOString()),
  ])

  // Week-over-week: compare last-7 vs prior-7 days
  const weekThis = (events7.data?.length) || 0
  const weekPrior = ((events14.data?.length) || 0) - weekThis
  const wow = weekPrior > 0 ? Math.round(((weekThis - weekPrior) / weekPrior) * 100) : 0

  // Top day
  const dayCount: Record<string, number> = {}
  events30.data?.forEach(e => {
    const d = new Date(e.created_at).toLocaleDateString('en-CA')
    dayCount[d] = (dayCount[d] || 0) + 1
  })
  const topDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''

  // Avg scores
  const allRatings = ratings30?.data ?? []
  const hCount = allRatings.filter((r: any) => r.helpful_score).length
  const hSum   = allRatings.filter((r: any) => r.helpful_score).reduce((s: number, r: any) => s + r.helpful_score, 0)
  const eCount = allRatings.filter((r: any) => r.easy_score).length
  const eSum   = allRatings.filter((r: any) => r.easy_score).reduce((s: number, r: any) => s + r.easy_score, 0)

  return {
    totalEvents: (events30.data?.length) || 0,
    totalRatings: allRatings.length || 0,
    avgHelpful: hCount ? +(hSum / hCount).toFixed(1) : 0,
    avgEasy: eCount ? +(eSum / eCount).toFixed(1) : 0,
    topDay,
    topDayCount: dayCount[topDay] || 0,
    weekOverWeek: wow,
  }
}

// --- ANALYTICS DATA ---

export async function getAnalyticsData() {
  const supabase = await getSupabase()

  const { data: allEvents } = await supabase
    .from('analytics_events')
    .select('event_type, created_at')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  const chartDataMap: Record<string, { date: string; ai_chat: number; copy_page: number; share_page: number; view_doc: number }> = {}

  allEvents?.forEach(event => {
    const date = new Date(event.created_at).toLocaleDateString('en-CA')
    if (!chartDataMap[date]) {
      chartDataMap[date] = { date, ai_chat: 0, copy_page: 0, share_page: 0, view_doc: 0 }
    }
    if (chartDataMap[date][event.event_type] !== undefined) {
      chartDataMap[date][event.event_type]++
    }
  })

  const chartData = Object.values(chartDataMap).sort((a, b) => a.date.localeCompare(b.date))

  const summary = allEvents?.reduce((acc, curr) => {
    acc[curr.event_type] = (acc[curr.event_type] || 0) + 1
    return acc
  }, { ai_chat: 0, copy_page: 0, share_page: 0, view_doc: 0 }) ?? { ai_chat: 0, copy_page: 0, share_page: 0, view_doc: 0 }

  return { chartData, summary }
}
