# DASHBOARD_BRAIN.md
## Admin Dashboard – Charts & Insights Master Plan

---

## 1. Context & Motivation

`/admin` hiện có 5 stat cards và **2 placeholder charts** ("Đang phát triển"):
- **Hoạt động gần đây** — Line/Area chart: xu hướng đánh giá hàng ngày (Hữu ích vs Dễ hiểu)
- **Bài viết phổ biến** — Horizontal Bar chart: Top 5 bài viết được đánh giá cao nhất

Thêm trang mới `/admin/insights` với nhiều insights chuyên sâu.

---

## 2. Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 App Router (Server + Client Components) |
| Charts | Recharts 2.15.4 |
| UI | shadcn/ui Card, Table, Badge, Skeleton |
| Data | Supabase: `analytics_events`, `doc_ratings`, `documents` |
| Styling | Tailwind CSS 4 |

---

## 3. Architecture

```
app/(docs)/admin/
├── page.tsx                   # Dashboard overview — server component
├── layout.tsx                 # Sidebar navigation
├── analytics/page.tsx         # Behavior analytics (exists)
├── ratings/page.tsx           # Doc ratings table (exists)
├── insights/
│   └── page.tsx              # NEW: Deep insights dashboard — client component
└── _components/               # NEW: Chart components
    ├── recent-activity-chart.tsx
    ├── popular-articles-chart.tsx
    ├── rating-trend-chart.tsx
    ├── engagement-funnel-chart.tsx
    └── top-searches-chart.tsx

lib/actions/admin.ts           # Extended: new server actions
```

---

## 4. Charts to Implement

### A. RecentActivityChart (`/admin` — col-span-4)
- **Type**: AreaChart (Recharts)
- **Data**: Last 14 days — count of `doc_ratings` by day, split by `helpful_score` vs `easy_score`
- **Series**: 2 stacked areas (Hữu ích = green, Dễ hiểu = blue)
- **XAxis**: Date labels (locale vi-VN)
- **Tooltip**: Số lượng mỗi loại
- **Source**: `analytics_events` + `doc_ratings` by date

### B. PopularArticlesChart (`/admin` — col-span-3)
- **Type**: HorizontalBarChart (Recharts)
- **Data**: Top 5 docs by total rating count (`totalRaters` from `getRatingStats`)
- **Bars**: avgHelpful score + avgEasy score (dual-bar)
- **Color**: Helpful = `#22c55e`, Easy = `#3b82f6`
- **Labels**: Doc title (truncated to 30 chars)
- **Source**: `getRatingStats()` server action

### C. RatingTrendChart (`/admin/insights` — full width)
- **Type**: LineChart
- **Data**: 30-day rolling avg helpful/easy score per doc
- **Lines**: One line per top-5 doc (by rating count), colored distinctly
- **Goal**: Spot which docs improve or decline over time

### D. EngagementFunnelChart (`/admin/insights`)
- **Type**: BarChart horizontal (funnel)
- **Data**: view_doc → copy_page → share_page → ai_chat (conversion funnel)
- **Calculation**: % of viewers who take each action (from `analytics_events`)

### E. TopSearchesChart (`/admin/insights`)
- **Type**: PieChart / RadialBarChart
- **Data**: Distribution of event types (replaces simple summary)
- **Enhanced**: Add week-over-week comparison numbers

---

## 5. New Server Actions (lib/actions/admin.ts)

```typescript
// Returns last 14 days of rating activity for AreaChart
getRatingTrendData(): Promise<{ date: string; helpful: number; easy: number }[]>

// Returns top N docs by rating volume + scores for HorizontalBarChart
getTopRatedDocs(n?: number): Promise<TopDoc[]>

// Returns 30-day rolling averages per doc for LineChart
getRatingTrendPerDoc(): Promise<Record<string, { date: string; helpful: number; easy: number }[]>>

// Returns funnel data: view → copy → share → chat
getEngagementFunnel(): Promise<FunnelStep[]>
```

---

## 6. SQL Views (Supabase) — Optional Enhancement

```sql
-- Materialized view for fast dashboard queries
CREATE MATERIALIZED VIEW dashboard_daily_stats AS
SELECT
  date_trunc('day', created_at) AS day,
  event_type,
  count(*) AS count
FROM analytics_events
GROUP BY 1, 2;

CREATE MATERIALIZED VIEW doc_rating_daily_stats AS
SELECT
  date_trunc('day', created_at) AS day,
  count(*) FILTER (WHERE helpful_score IS NOT NULL) AS helpful,
  count(*) FILTER (WHERE easy_score IS NOT NULL) AS easy
FROM doc_ratings
GROUP BY 1;
```

---

## 7. File Plan

| # | File | Type | Action |
|---|------|------|--------|
| 1 | `DASHBOARD_BRAIN.md` | docs | CREATE |
| 2 | `lib/actions/admin.ts` | server actions | EXTEND |
| 3 | `app/(docs)/admin/_components/recent-activity-chart.tsx` | chart | CREATE |
| 4 | `app/(docs)/admin/_components/popular-articles-chart.tsx` | chart | CREATE |
| 5 | `app/(docs)/admin/page.tsx` | page | REPLACE placeholders |
| 6 | `app/(docs)/admin/insights/page.tsx` | page | CREATE |
| 7 | `app/(docs)/admin/layout.tsx` | layout | ADD insights nav |

---

## 8. Implementation Order

1. **Extend `lib/actions/admin.ts`** — Add new data-fetching functions
2. **RecentActivityChart** — Area chart for main dashboard
3. **PopularArticlesChart** — Horizontal bar for main dashboard
4. **Update `/admin/page.tsx`** — Wire in real charts, remove placeholders
5. **Insights page** — RatingTrendChart + EngagementFunnel + TopSearches
6. **Sidebar nav** — Add "Insights" link
