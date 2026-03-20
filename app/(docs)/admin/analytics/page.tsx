
'use client'

import { useState, useEffect } from 'react'
import { getAnalyticsData } from "@/lib/actions/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Loader2 } from 'lucide-react'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const result = await getAnalyticsData()
      setData(result)
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const pieData = [
    { name: 'AI Chat', value: data.summary.ai_chat },
    { name: 'Copy Page', value: data.summary.copy_page },
    { name: 'Share Page', value: data.summary.share_page },
    { name: 'View Doc', value: data.summary.view_doc },
  ].filter(item => item.value > 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Phân tích hành vi</h1>
        <p className="text-muted-foreground mt-2">
          Thống kê tương tác người dùng trong 30 ngày qua
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Daily Activity Chart */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Tương tác hàng ngày</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="view_doc" name="Xem bài viết" stackId="a" fill="#8884d8" />
                <Bar dataKey="ai_chat" name="Chat AI" stackId="a" fill="#82ca9d" />
                <Bar dataKey="copy_page" name="Copy nội dung" stackId="a" fill="#ffc658" />
                <Bar dataKey="share_page" name="Chia sẻ" stackId="a" fill="#ff8042" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Phân bổ sự kiện</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Tổng quan tương tác</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-medium">Lượt xem bài viết</span>
                <span className="font-bold text-xl">{data.summary.view_doc}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-medium">Tin nhắn AI Chat</span>
                <span className="font-bold text-xl">{data.summary.ai_chat}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-medium">Lượt Copy trang</span>
                <span className="font-bold text-xl">{data.summary.copy_page}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-medium">Lượt chia sẻ</span>
                <span className="font-bold text-xl">{data.summary.share_page}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="font-bold text-primary">Tổng sự kiện</span>
                <span className="font-bold text-2xl text-primary">
                  {data.summary.ai_chat + data.summary.copy_page + data.summary.share_page + data.summary.view_doc}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
