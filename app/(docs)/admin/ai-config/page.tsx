'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Save, Key, Cpu, Link as LinkIcon, Database } from 'lucide-react'

interface AiConfig {
  provider: string
  apiKey: string
  model: string
  baseURL: string
}

export default function AiConfigPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [config, setConfig] = configDefault()

  function configDefault(): [AiConfig, React.Dispatch<React.SetStateAction<AiConfig>>] {
    return useState<AiConfig>({
      provider: 'token.ai',
      apiKey: '',
      model: 'gpt-5-chat',
      baseURL: 'https://token.ai.vn/v1'
    })
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/admin/ai-config')
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
      } else {
        toast.error('Không thể tải cấu hình hiện tại')
      }
    } catch (error) {
      console.error(error)
      toast.error('Có lỗi xảy ra khi tải cấu hình')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSaving(true)
      const res = await fetch('/api/admin/ai-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      })

      if (res.ok) {
        toast.success('Lưu cấu hình thành công!')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Lỗi khi lưu cấu hình')
      }
    } catch (error) {
      console.error(error)
      toast.error('Đã xảy ra lỗi mạng')
    } finally {
      setIsSaving(false)
    }
  }

  const handleProviderChange = (val: string) => {
    let baseURL = 'https://token.ai.vn/v1'
    let model = 'gpt-5-chat'

    if (val === 'openrouter') {
      baseURL = 'https://openrouter.ai/api/v1'
      model = 'google/gemini-2.5-flash'
    } else if (val === 'kymaapi') {
      baseURL = 'https://kymaapi.com/v1'
      model = 'gpt-4o'
    }

    setConfig(prev => ({
      ...prev,
      provider: val,
      baseURL,
      model
    }))
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cấu hình AI Provider</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Quản lý nguồn cung cấp mô hình AI cho tính năng RAG Chat.
        </p>
      </div>

      <Card className="max-w-2xl">
        <form onSubmit={handleSave}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5 text-primary" />
              Thiết lập Provider & Model
            </CardTitle>
            <CardDescription>
              Thay đổi provider sẽ áp dụng ngay lập tức trên hệ thống live chat.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="provider">Nhà Cung Cấp (Provider)</Label>
              <Select value={config.provider} onValueChange={handleProviderChange}>
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Chọn Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="token.ai">Token.ai.vn (Mặc định)</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                  <SelectItem value="kymaapi">KymaAPI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey" className="flex items-center justify-between">
                <span>API Key</span>
                <span className="text-xs text-muted-foreground font-normal">
                  (Để trống nếu muốn dùng biến môi trường mặc định)
                </span>
              </Label>
              <div className="relative">
                <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Nhập API Key ở đây..."
                  value={config.apiKey}
                  onChange={e => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Mô hình mặc định (Model)</Label>
              <div className="relative">
                <Cpu className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="model"
                  placeholder="VD: gpt-5-chat hoặc google/gemini-2.5-flash"
                  value={config.model}
                  onChange={e => setConfig(prev => ({ ...prev, model: e.target.value }))}
                  className="pl-9"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Gợi ý cho OpenRouter: <code>google/gemini-2.5-flash</code>, <code>anthropic/claude-3-haiku</code>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseURL">Base URL API</Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="baseURL"
                  placeholder="https://..."
                  value={config.baseURL}
                  onChange={e => setConfig(prev => ({ ...prev, baseURL: e.target.value }))}
                  className="pl-9"
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t px-6 py-4">
            <Button type="submit" disabled={isSaving} className="w-full sm:w-auto ml-auto gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu thay đổi
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
