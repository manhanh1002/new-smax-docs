
import { getRatingStats } from "@/lib/actions/admin"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ThumbsUp, HelpCircle, MessageSquare, AlertCircle } from "lucide-react"
import Link from "next/link"

export default async function RatingsPage() {
  const ratings = await getRatingStats()

  // Calculate overview stats from aggregated data
  const totalFeedbacks = ratings.reduce((acc, item) => acc + item.total, 0)

  // Calculate weighted averages safely
  const totalHelpfulScore = ratings.reduce((acc, item) => acc + (item.helpfulSum || 0), 0)
  const totalHelpfulCount = ratings.reduce((acc, item) => acc + (item.helpfulCount || 0), 0)
  const avgHelpful = totalHelpfulCount ? (totalHelpfulScore / totalHelpfulCount).toFixed(1) : "0.0"

  const totalEasyScore = ratings.reduce((acc, item) => acc + (item.easySum || 0), 0)
  const totalEasyCount = ratings.reduce((acc, item) => acc + (item.easyCount || 0), 0)
  const avgEasy = totalEasyCount ? (totalEasyScore / totalEasyCount).toFixed(1) : "0.0"

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Đánh giá tài liệu</h1>
        <p className="text-muted-foreground mt-2">
          Chi tiết phản hồi và điểm số từng bài viết
        </p>
      </div>

      {/* Score Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Điểm hữu ích TB</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgHelpful}</div>
            <p className="text-xs text-muted-foreground">Mức độ hữu ích (1-3)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Điểm dễ hiểu TB</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgEasy}</div>
            <p className="text-xs text-muted-foreground">Mức độ dễ hiểu (1-3)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng lượt đánh giá</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFeedbacks}</div>
            <p className="text-xs text-muted-foreground">Số lần gửi phản hồi</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Người dùng tham gia</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ratings.reduce((acc, item) => acc + item.totalRaters, 0)}</div>
            <p className="text-xs text-muted-foreground">Ước tính user duy nhất</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[400px]">Tài liệu</TableHead>
              <TableHead className="text-right">Người đánh giá</TableHead>
              <TableHead className="text-right">Điểm hữu ích</TableHead>
              <TableHead className="text-right">Điểm dễ hiểu</TableHead>
              <TableHead className="text-right">Gần nhất</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ratings.map((doc: any) => (
              <TableRow key={doc.slug}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium truncate max-w-[380px]" title={doc.title}>{doc.title}</span>
                    <Link href={`/vi/${doc.slug}`} target="_blank" className="text-xs text-muted-foreground hover:underline">
                      {doc.slug}
                    </Link>
                  </div>
                </TableCell>
                <TableCell className="text-right">{doc.totalRaters}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={Number(doc.avgHelpful) >= 2.5 ? "default" : Number(doc.avgHelpful) >= 1.5 ? "secondary" : "outline"}>
                    {doc.avgHelpful}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={Number(doc.avgEasy) >= 2.5 ? "default" : Number(doc.avgEasy) >= 1.5 ? "secondary" : "outline"}>
                    {doc.avgEasy}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {new Date(doc.lastRated).toLocaleDateString('vi-VN')}
                </TableCell>
              </TableRow>
            ))}
            {ratings.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Chưa có dữ liệu đánh giá.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
