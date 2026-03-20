'use client'

import { useState, useEffect } from 'react'
import { getRatingTrendData } from '@/lib/actions/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Loader2, BarChart3 } from 'lucide-react'

type RatingTrendPoint = {
  date: string
  helpful: number
  easy: number
}

export function RecentActivityChart() {
  const [data, setData] = useState<RatingTrendPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const result = await getRatingTrendData()
      setData(result)
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Xu hướng đánh giá (14 ngày)</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Xu hướng đánh giá (14 ngày)</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <BarChart3 className="h-10 w-10" />
            <p className="text-sm">Chưa có dữ liệu xu hướng đánh giá.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Xu hướng đánh giá (14 ngày)</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorHelpful" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorEasy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString('vi-VN', {
                  month: 'short',
                  day: 'numeric',
                })
              }
            />
            <YAxis allowDecimals={false} />
            <Tooltip
              labelFormatter={(value) =>
                new Date(value).toLocaleDateString('vi-VN', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              }
              formatter={(value: number, name: string) => [
                value,
                name === 'helpful' ? 'Hữu ích' : 'Dễ hiểu',
              ]}
            />
            <Legend
              formatter={(value: string) =>
                value === 'helpful' ? 'Hữu ích' : 'Dễ hiểu'
              }
            />
            <Area
              type="monotone"
              dataKey="helpful"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#colorHelpful)"
            />
            <Area
              type="monotone"
              dataKey="easy"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#colorEasy)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
