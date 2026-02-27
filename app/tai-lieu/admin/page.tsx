
import { getDashboardStats } from "@/lib/actions/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Star, MessageSquare, Activity, ThumbsUp, Eye } from "lucide-react"

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Tổng quan hệ thống</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng số bài viết</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocs}</div>
            <p className="text-xs text-muted-foreground">Bài viết trong Knowledge Base</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lượt xem hôm nay</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.viewsToday}</div>
            <p className="text-xs text-muted-foreground">Lượt xem bài viết trong 24h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng đánh giá</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRatings}</div>
            <p className="text-xs text-muted-foreground">Phản hồi từ người dùng</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Điểm trung bình</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRating}</div>
            <p className="text-xs text-muted-foreground">Thang điểm 3.0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tương tác hôm nay</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.eventsToday}</div>
            <p className="text-xs text-muted-foreground">Chat/Share/Copy trong 24h</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Charts Placeholder - Can be implemented with Client Components */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Hoạt động gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Biểu đồ: Xu hướng đánh giá hàng ngày (Hữu ích vs Dễ hiểu)</p>
            <div className="h-[200px] flex items-center justify-center border-dashed border rounded bg-muted/20 mt-4">
              Đang phát triển
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Bài viết phổ biến</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Danh sách: Top 5 bài viết được đánh giá cao nhất</p>
             <div className="h-[200px] flex items-center justify-center border-dashed border rounded bg-muted/20 mt-4">
              Đang phát triển
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
