'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, Globe, Lock, Terminal, MessageSquare } from 'lucide-react'
import Link from 'next/link'

export default function ApiDocsPage() {
  const apiBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tailieu.smax.ai'

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Breadcrumbs/Back */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2 h-8">
          <Link href="/admin/embed-code">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Quay lại Mã Nhúng
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Tài liệu REST API</h1>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">v1.0.0</Badge>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Hướng dẫn chi tiết cách tích hợp trực tiếp với hệ thống RAG của SmaxAI để tự xây dựng giao diện hội thoại riêng.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Authentication & Security */}
        <Card className="border-orange-100 bg-orange-50/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
              <Lock className="h-4 w-4" />
              Bảo mật & CORS
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p>
              Để bảo vệ tài nguyên AI, API này chỉ chấp nhận các yêu cầu từ các Origin được cho phép:
            </p>
            <ul className="list-disc list-inside space-y-1 font-medium text-orange-800">
              <li>smax.ai</li>
              <li>*.smax.ai (bao gồm dev.smax.ai, biz.smax.ai)</li>
              <li>docs.cdp.vn</li>
            </ul>
            <p className="text-muted-foreground italic">
              Lưu ý: Nếu bạn gọi API từ phía Server (Node.js, Python...), CORS sẽ không bị áp dụng.
            </p>
          </CardContent>
        </Card>

        {/* Endpoint Detail */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Gửi tin nhắn (Chat)
            </CardTitle>
            <CardDescription>Gửi câu hỏi và nhận phản hồi từ bộ não AI dựa trên tài liệu.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 font-mono text-sm">
              <Badge className="bg-green-600">POST</Badge>
              <span className="text-foreground">{apiBaseUrl}/api/chat</span>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Request Body (JSON)</h4>
              <div className="bg-[#0f172a] rounded-xl p-4 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed">
                <pre>{`{
  "query": "Làm thế nào để kết nối Zalo?", // (Bắt buộc) Câu hỏi của người dùng
  "model": "model-router",              // (Tùy chọn) 'gpt-5-chat' hoặc 'model-router'
  "lang": "vi",                          // (Tùy chọn) 'vi' hoặc 'en'
  "history": [                           // (Tùy chọn) Lịch sử hội thoại để AI nhớ ngữ cảnh
    { "role": "user", "content": "Chào bạn" },
    { "role": "assistant", "content": "Chào bạn, tôi là trợ lý SmaxAI." }
  ]
}`}</pre>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Cơ chế chọn Model (Smart Routing)</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Hệ thống tự động điều hướng model để tối ưu hóa hiệu năng và chi phí:
              </p>
              <ul className="text-xs space-y-2 text-muted-foreground list-disc list-inside bg-muted/30 p-4 rounded-lg">
                <li><b className="text-foreground">Yêu cầu từ Browser/Widget:</b> Mặc định dùng <code className="bg-muted px-1 rounded text-primary">gpt-5-chat</code> để đảm bảo tốc độ ổn định.</li>
                <li><b className="text-foreground">Yêu cầu từ API trực tiếp:</b> Mặc định dùng <code className="bg-muted px-1 rounded text-primary">model-router</code> để tận dụng khả năng định tuyến thông minh.</li>
                <li><b className="text-foreground">Ghi đè chủ động:</b> Bạn có thể truyền thuộc tính <code className="bg-muted px-1 rounded text-primary">model</code> trong body để chọn model mong muốn.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Response</h4>
              <p className="text-sm text-muted-foreground">
                API trả về phản hồi dưới dạng <b>Stream (Text/Plain)</b>. Bạn nên sử dụng `ReadableStream` để đọc dữ liệu và hiển thị lên UI theo kiểu gõ chữ (typing).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Code Example */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Ví dụ Implementation (JavaScript)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-[#0f172a] rounded-xl p-4 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed">
              <pre>{`async function askAI(query) {
  const response = await fetch('${apiBaseUrl}/api/chat', {
    method: 'POST',
    body: JSON.stringify({ query, lang: 'vi' }),
    headers: { 'Content-Type': 'application/json' }
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    console.log("AI gõ:", chunk); // Hiển thị chunk này lên UI
  }
}`}</pre>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Support footer */}
      <div className="flex justify-center pt-4">
        <p className="text-sm text-muted-foreground">
          Cần hỗ trợ thêm về kỹ thuật? <Button variant="link" className="p-0 h-auto text-primary">Liên hệ Dev Team Smax</Button>
        </p>
      </div>
    </div>
  )
}
