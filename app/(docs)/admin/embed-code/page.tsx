'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Copy, Check, Info, Code, Layers, Globe } from 'lucide-react'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default function EmbedCodePage() {
  const [apiBaseUrl, setApiBaseUrl] = useState(
    typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin)
      : 'https://docs.cdp.vn'
  )
  const [lang, setLang] = useState<'vi' | 'en'>('vi')
  const [activeTab, setActiveTab] = useState('script')
  const [copied, setCopied] = useState<'idle' | 'copied'>('idle')

  const sdkScriptSrc = `${apiBaseUrl}/sdk-dist/smaxai-chat.min.js`
  
  const embedCodeMap: Record<string, string> = useMemo(() => ({
    script: `<!-- SmaxAI Chat Widget -->
<script src="${sdkScriptSrc}"></script>
<script>
  if (typeof SmaxAIChat !== 'undefined') {
    SmaxAIChat.init({
      apiBaseUrl: '${apiBaseUrl}',
      lang: '${lang}'
    });
  }
</script>`,
    sdk: `// Cài đặt SDK hoặc import trực tiếp
// import { SmaxAIChat } from '@smaxai/chat-sdk';

// Khởi tạo widget trong TypeScript/React
SmaxAIChat.init({
  apiBaseUrl: '${apiBaseUrl}',
  lang: '${lang}',
  userId: 'user_123', // Tùy chọn: định danh người dùng
  onOpen: () => console.log('Widget opened'),
  onClose: () => console.log('Widget closed')
});`,
    api: `// Endpoint: POST ${apiBaseUrl}/api/chat
// Payload mẫu:
{
  "query": "Làm thế nào để tích hợp SmaxAI?",
  "lang": "${lang}",
  "history": [
    { "role": "user", "content": "Chào bạn" },
    { "role": "assistant", "content": "Chào bạn, tôi có thể giúp gì cho bạn?" }
  ]
}`
  }), [sdkScriptSrc, apiBaseUrl, lang])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCodeMap[activeTab])
      setCopied('copied')
      toast.success('Đã sao chép mã!')
      setTimeout(() => setCopied('idle'), 2000)
    } catch {
      toast.error('Không thể sao chép. Vui lòng thử lại.')
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Tích hợp Chat Widget</h1>
        <p className="text-muted-foreground">
          Chọn phương thức tích hợp phù hợp nhất với dự án của bạn
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT — Configuration Form (Now taking 1 column in grid if needed, or we can keep it balanced) */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-sm border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Cấu hình Widget</CardTitle>
                <CardDescription>
                  Tùy chỉnh thông số cơ bản cho widget.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="apiBaseUrl" className="text-sm font-medium">API Base URL</Label>
                  <Input
                    id="apiBaseUrl"
                    type="url"
                    className="h-9"
                    placeholder="https://docs.cdp.vn"
                    value={apiBaseUrl}
                    onChange={(e) => setApiBaseUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Ngôn ngữ mặc định</Label>
                  <div className="flex p-1 bg-muted rounded-md gap-1">
                    <Button
                      type="button"
                      variant={lang === 'vi' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setLang('vi')}
                      className={`flex-1 h-7 text-xs ${lang === 'vi' ? 'bg-background shadow-sm' : ''}`}
                    >
                      Tiếng Việt
                    </Button>
                    <Button
                      type="button"
                      variant={lang === 'en' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setLang('en')}
                      className={`flex-1 h-7 text-xs ${lang === 'en' ? 'bg-background shadow-sm' : ''}`}
                    >
                      English
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50 bg-primary/[0.03]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  Lưu ý quan trọng
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground leading-relaxed">
                Đảm bảo domain của bạn đã được cấu hình trong danh sách <b>CORS Allowed Origins</b> tại file <code className="text-primary">lib/cors.ts</code> để tránh lỗi truy cập API.
              </CardContent>
            </Card>
          </div>

          {/* RIGHT — Tabs & Code Display */}
          <div className="lg:col-span-2 space-y-6">
            <TabsList className="grid grid-cols-2 w-full max-w-sm">
              <TabsTrigger value="script" className="gap-2">
                <Globe className="h-3.5 w-3.5" />
                Dán mã Script
              </TabsTrigger>
              <TabsTrigger value="api" className="gap-2">
                <Code className="h-3.5 w-3.5" />
                Gọi REST API
              </TabsTrigger>
            </TabsList>

            <Card className="shadow-md border-border/60 overflow-hidden">
              <div className="bg-muted/50 border-b border-border/50 px-4 py-2 flex justify-between items-center text-xs font-mono text-muted-foreground">
                <span>{activeTab === 'script' ? 'index.html' : 'POST /api/chat'}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 gap-1.5 text-xs hover:bg-background"
                  onClick={handleCopy}
                >
                  {copied === 'copied' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied === 'copied' ? 'Đã chép' : 'Sao chép'}
                </Button>
              </div>
              <div className="bg-[#0f172a] p-5">
                <pre className="text-sm overflow-x-auto font-mono text-slate-100 selection:bg-primary/30">
                  <code dangerouslySetInnerHTML={{ __html: escapeHtml(embedCodeMap[activeTab] || '') }} />
                </pre>
              </div>
              <CardContent className="p-4 bg-background">
                <TabsContent value="script" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">1. Nhúng cơ bản</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Dán đoạn script trên vào trước thẻ <code className="bg-muted px-1 py-0.5 rounded">&lt;/body&gt;</code>. 
                      SmaxAI Widget sẽ tự động tải giao diện và hiển thị nút chat.
                    </p>
                  </div>
                  
                  <div className="pt-2 border-t border-border/50 space-y-2">
                    <p className="text-sm font-medium">2. JavaScript API (Điều khiển bằng code)</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Bạn có thể dùng JS để bật/tắt widget từ các nút bấm riêng trên trang web:
                    </p>
                    <div className="bg-muted p-2 rounded text-[11px] font-mono overflow-x-auto">
                      SmaxAIChat.widget.open();  // Mở khung chat<br/>
                      SmaxAIChat.widget.close(); // Đóng khung chat<br/>
                      SmaxAIChat.widget.toggle(); // Đảo ngược trạng thái
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="api" className="mt-0 space-y-2">
                  <p className="text-sm font-medium">Gọi trực tiếp vào Backend RAG</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Kết nối trực tiếp vào hệ thống AI thông qua API. Endpoint này hỗ trợ <b>vô hiệu hóa CORS</b> (cho phép mọi domain gọi vào).
                    Bạn có thể truyền <code className="bg-muted px-1 py-0.5 rounded">history</code> để AI nhớ ngữ cảnh cuộc trò chuyện.
                  </p>
                </TabsContent>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border/50 bg-card/50 flex flex-col gap-2">
                <h4 className="text-sm font-semibold">Tài liệu chi tiết</h4>
                <p className="text-xs text-muted-foreground">Khám phá toàn bộ các tùy chọn cấu hình nâng cao trong phần hướng dẫn SDK.</p>
                <Button variant="link" className="p-0 h-auto w-fit text-primary font-medium text-xs">Xem tài liệu →</Button>
              </div>
              <div className="p-4 rounded-xl border border-border/50 bg-card/50 flex flex-col gap-2">
                <h4 className="text-sm font-semibold">Hỗ trợ kỹ thuật</h4>
                <p className="text-xs text-muted-foreground">Bạn gặp khó khăn khi tích hợp? Hãy liên hệ với đội ngũ kỹ thuật của chúng tôi.</p>
                <Button variant="link" className="p-0 h-auto w-fit text-primary font-medium text-xs">Gửi yêu cầu →</Button>
              </div>
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  )
}

