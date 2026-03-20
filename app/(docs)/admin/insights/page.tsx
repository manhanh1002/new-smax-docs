'use client'

import { useState, useEffect } from 'react'
import { getInsightsStats, getEngagementFunnel } from '@/lib/actions/admin'
import { getAnalyticsData } from '@/lib/actions/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const PIE_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042']

type InsightStats = {
  totalEvents: number
  totalRatings: number
  avgHelpful: number
  avgEasy: number
  topDay: string
  topDayCount: number
  weekOverWeek: number
}

type FunnelStep = {
  name: string
  value: number
  fill: string
  _raw: number
}

type AnalyticsData = {
  summary: {
    ai_chat: number
    copy_page: number
    share_page: number
    view_doc: number
  }
}

function formatDate(iso: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function InsightsPage() {
  const [stats, setStats] = useState<InsightStats | null>(null)
  const [funnel, setFunnel] = useState<FunnelStep[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getInsightsStats(),
      getEngagementFunnel(),
      getAnalyticsData(),
    ]).then(([s, f, a]) => {
      setStats(s)
      setFunnel(f)
      setAnalytics(a)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const pieData = analytics
    ? [
        { name: 'AI Chat', value: analytics.summary.ai_chat },
        { name: 'Copy Page', value: analytics.summary.copy_page },
        { name: 'Share Page', value: analytics.summary.share_page },
        { name: 'View Doc', value: analytics.summary.view_doc },
      ].filter(item => item.value > 0)
    : []

  const wow = stats?.weekOverWeek ?? 0
  const wowPositive = wow >= 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Insights chuyên sâu</h1>
        <p className="text-muted-foreground mt-2">
          Phân tích hành vi người dùng
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Events 30d */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng sự kiện 30 ngày</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEvents ?? 0}</div>
            <p className="text-xs text-muted-foreground">Sự kiện tương tác</p>
          </CardContent>
        </Card>

        {/* Hot Day */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ngày nóng nhất</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDate(stats?.topDay ?? '')}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.topDayCount ?? 0} sự kiện
            </p>
          </CardContent>
        </Card>

        {/* Week over Week */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tuần này vs tuần trước</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${wowPositive ? 'text-green-600' : 'text-red-600'}`}>
              {wowPositive ? '+' : ''}{wow}%
            </div>
            <p className="text-xs text-muted-foreground">
              {wowPositive ? 'Tăng' : 'Giảm'} so với tuần trước
            </p>
          </CardContent>
        </Card>

        {/* Avg Scores */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Điểm trung bình</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Hữu ích {stats?.avgHelpful ?? 0} · Dễ {stats?.avgEasy ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Thang điểm 3.0</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Engagement Funnel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Engagement Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            {funnel.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                Chưa có dữ liệu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  layout="vertical"
                  data={funnel}
                  margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number, _: string, props: any) => [
                      `${value}% (${props.payload._raw})`,
                      'Tỷ lệ',
                    ]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Legend />
                  <Bar
                    dataKey="value"
                    name="Tỷ lệ"
                    fill="#8884d8"
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Event Distribution */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Phân bổ sự kiện</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                Chưa có dữ liệu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={110}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
