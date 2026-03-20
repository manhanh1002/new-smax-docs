'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Copy, Check, Info } from 'lucide-react'

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
      ? (process.env.NEXT_PUBLIC_APP_URL || 'https://docs.cdp.vn')
      : 'https://docs.cdp.vn'
  )
  const [lang, setLang] = useState<'vi' | 'en'>('vi')
  const [copied, setCopied] = useState<'idle' | 'copied'>('idle')

  const sdkScriptSrc = `${apiBaseUrl}/sdk-dist/smaxai-chat.min.js`
  const embedCode = useMemo(() => {
    return `<!-- SmaxAI Chat Widget -->
<script src="${sdkScriptSrc}"></script>
<script>
  if (typeof SmaxAIChat !== 'undefined') {
    SmaxAIChat.init({
      apiBaseUrl: '${apiBaseUrl}',
      lang: '${lang}'
    });
  } else {
    console.error('SmaxAI Chat: SDK script failed to load');
  }
</script>`
  }, [sdkScriptSrc, apiBaseUrl, lang])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode)
      setCopied('copied')
      toast.success('Đã sao chép mã nhúng!')
      setTimeout(() => setCopied('idle'), 2000)
    } catch {
      toast.error('Không thể sao chép. Vui lòng thử lại.')
    }
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold">Mã Nhúng</h1>
        <p className="text-muted-foreground mt-2">
          Tạo mã nhúng widget AI Chat cho website của bạn
        </p>
      </div>

      {/* 2-column grid: Form (left) | Preview (right) */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* LEFT — Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle>Cấu hình</CardTitle>
            <CardDescription>
              Thiết lập các thông số cho widget trước khi tạo mã nhúng.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* apiBaseUrl */}
            <div className="space-y-2">
              <Label htmlFor="apiBaseUrl">API Base URL</Label>
              <Input
                id="apiBaseUrl"
                type="url"
                placeholder="https://docs.cdp.vn"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Địa chỉ gốc của API. Widget sẽ gọi đến endpoint này.
              </p>
            </div>

            {/* lang — button group fallback (no Select component) */}
            <div className="space-y-2">
              <Label>Ngôn ngữ</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={lang === 'vi' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLang('vi')}
                  className="flex-1"
                >
                  Tiếng Việt
                </Button>
                <Button
                  type="button"
                  variant={lang === 'en' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLang('en')}
                  className="flex-1"
                >
                  English
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Ngôn ngữ mặc định của widget. Ảnh hưởng đến prompt và phản hồi.
              </p>
            </div>

          </CardContent>
        </Card>

        {/* RIGHT — Live Preview + Copy */}
        <Card>
          <CardHeader>
            <CardTitle>Xem trước</CardTitle>
            <CardDescription>
              Mã nhúng cập nhật theo thời gian thực khi bạn thay đổi cấu hình.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Code block — styled <pre> */}
            <div className="relative rounded-lg border border-border bg-muted/40 overflow-hidden">
              <pre className="p-4 text-sm overflow-x-auto max-h-[320px] overflow-y-auto font-mono">
                <code dangerouslySetInnerHTML={{ __html: escapeHtml(embedCode) }} />
              </pre>
            </div>

            {/* Copy button */}
            <Button
              variant={copied === 'copied' ? 'secondary' : 'default'}
              className="w-full gap-2"
              onClick={handleCopy}
            >
              {copied === 'copied' ? (
                <>
                  <Check className="h-4 w-4" />
                  Đã sao chép!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Sao chép mã nhúng
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Dán mã này vào thẻ{' '}
              <code className="bg-muted px-1 py-0.5 rounded text-foreground">&lt;head&gt;</code>{' '}
              hoặc cuối thẻ{' '}
              <code className="bg-muted px-1 py-0.5 rounded text-foreground">&lt;/body&gt;</code>{' '}
              của website bạn.
            </p>

          </CardContent>
        </Card>

      </div>

      {/* Deployment instructions card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Hướng dẫn triển khai
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <ol className="list-decimal list-inside space-y-1">
            <li>
              Copy mã nhúng bên trên bằng nút{' '}
              <strong className="text-foreground">Sao chép mã nhúng</strong>
            </li>
            <li>
              Dán vào thẻ{' '}
              <code className="bg-muted px-1 py-0.5 rounded text-foreground">&lt;head&gt;</code>{' '}
              hoặc trước{' '}
              <code className="bg-muted px-1 py-0.5 rounded text-foreground">&lt;/body&gt;</code>{' '}
              trên trang web của bạn
            </li>
            <li>
              Đảm bảo domain của bạn được cấu hình trong danh sách CORS allowed origins (kiểm
              tra{' '}
              <code className="bg-muted px-1 py-0.5 rounded text-foreground">lib/cors.ts</code>)
            </li>
            <li>Tải lại trang — widget sẽ xuất hiện ở góc dưới bên phải màn hình</li>
          </ol>
        </CardContent>
      </Card>

    </div>
  )
}
