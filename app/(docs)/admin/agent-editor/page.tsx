'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Bot, 
  Send, 
  Terminal, 
  Search, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  RefreshCcw,
  Zap
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface LogEntry {
  type: 'log' | 'status' | 'error' | 'success'
  message: string
  timestamp: string
}

interface Document {
  id: string
  title: string
}

export default function AgentEditorPage() {
  const [query, setQuery] = useState('')
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [command, setCommand] = useState('')
  
  const logEndRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close()
    }
  }, [])

  const addLog = (message: string, type: LogEntry['type'] = 'log') => {
    setLogs(prev => [...prev, {
      type,
      message,
      timestamp: new Date().toLocaleTimeString()
    }])
  }

  const searchArticles = async () => {
    if (!query) return
    setIsSearching(true)
    try {
      const collectionId = "606c4b92-1207-49f5-b95a-13435f7055f1" 
      const response = await fetch(`http://localhost:4002/collections/${collectionId}/documents`)
      const data = await response.json()
      
      const allDocs = data.documents || []
      
      // Client-side filtering based on query
      const filtered = allDocs.filter((doc: Document) => 
        doc.title.toLowerCase().includes(query.toLowerCase()) ||
        doc.id.toLowerCase() === query.toLowerCase()
      )
      
      setDocuments(filtered)
      
      if (filtered.length === 0) {
        addLog(`Không tìm thấy bài viết nào khớp với "${query}"`, 'status')
      }
    } catch (error) {
      addLog("Không thể tải danh sách bài viết. Hãy chắc chắn AI Orchestrator đang chạy tại port 4002.", "error")
    } finally {
      setIsSearching(false)
    }
  }

  const startOrchestration = async () => {
    if (!selectedDoc) return

    setIsProcessing(true)
    setLogs([])
    addLog(`Đang khởi tạo đội ngũ Agent cho bài viết: ${selectedDoc.title}`, 'status')

    try {
      const response = await fetch('http://localhost:4002/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: selectedDoc.id,
          document_title: selectedDoc.title,
          command: command
        })
      })

      const data = await response.json()
      
      if (data.log_id) {
        // Start SSE stream
        const eventSource = new EventSource(`http://localhost:4002/stream/${data.log_id}`)
        eventSourceRef.current = eventSource

        eventSource.addEventListener('log', (event) => {
          addLog(event.data, 'log')
        })

        eventSource.addEventListener('end', (event) => {
          addLog("Tất cả Agent đã hoàn thành công việc!", 'success')
          setIsProcessing(false)
          eventSource.close()
        })

        eventSource.onerror = (error) => {
          console.error("SSE Error:", error)
          addLog("Mất kết nối với Agent service.", "error")
          setIsProcessing(false)
          eventSource.close()
        }
      }
    } catch (error) {
      addLog("Lỗi khi kết nối với AI Orchestrator.", "error")
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Agent Editor</h1>
        <p className="text-muted-foreground">
          Giao tiếp với đội ngũ AI Agent để nghiên cứu, đánh giá và viết lại tài liệu của bạn.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Input & Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">
              <Search className="h-4 w-4" />
              1. Chọn bài viết
            </div>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Nhập từ khóa tìm kiếm..." 
                className="flex-1 bg-muted/50 border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchArticles()}
              />
              <Button size="sm" onClick={searchArticles} disabled={isSearching}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tìm"}
              </Button>
            </div>

            <div className="max-h-[200px] overflow-y-auto border border-border rounded-md bg-muted/20">
              {documents.length > 0 ? (
                <div className="divide-y divide-border">
                  {documents.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm transition-colors hover:bg-primary/10 flex items-center gap-2",
                        selectedDoc?.id === doc.id ? "bg-primary/15 text-primary font-medium" : ""
                      )}
                    >
                      <FileText className="h-3.5 w-3.5 opacity-60" />
                      <span className="truncate">{doc.title}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-muted-foreground italic">
                  Chưa có bài viết nào được chọn
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">
              <Bot className="h-4 w-4" />
              2. Ra lệnh cho Agent
            </div>
            
            <textarea 
              placeholder="Ví dụ: Hãy viết lại bài này theo văn phong hỗ trợ khách hàng, thêm các ví dụ thực tế về chatbot..."
              className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm min-h-[120px] outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
            />

            <Button 
              className="w-full gap-2 py-6 text-lg font-bold shadow-lg shadow-primary/20"
              disabled={!selectedDoc || isProcessing}
              onClick={startOrchestration}
            >
              {isProcessing ? (
                <>
                  <RefreshCcw className="h-5 w-5 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Triển khai Agent
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Column: Console / Logs */}
        <div className="lg:col-span-2 flex flex-col min-h-[500px]">
          <div className="flex-1 bg-[#0f172a] text-slate-300 rounded-xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden font-mono text-sm relative">
            {/* Console Header */}
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="ml-4 flex items-center gap-2 text-xs font-medium text-slate-400">
                  <Terminal className="h-3.5 w-3.5" />
                  AGENT_CONSOLE_STREAM
                </div>
              </div>
              {isProcessing && (
                <div className="flex items-center gap-2 text-[10px] text-primary animate-pulse">
                  <Zap className="h-3 w-3 fill-primary" />
                  LIVE PROCESSING
                </div>
              )}
            </div>

            {/* Console Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20 select-none">
                  <Bot className="h-16 w-16 mb-4" />
                  <p>Sẵn sàng nhận lệnh từ bạn...</p>
                </div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={cn(
                    "border-l-2 pl-3 py-1 animate-in fade-in slide-in-from-left-2 duration-300",
                    log.type === 'status' ? "border-primary text-primary" : 
                    log.type === 'error' ? "border-red-500 text-red-400" :
                    log.type === 'success' ? "border-green-500 text-green-400" :
                    "border-slate-700"
                  )}>
                    <div className="flex items-center gap-2 text-[10px] opacity-40 mb-1">
                      <span>[{log.timestamp}]</span>
                      {log.type === 'status' && <Sparkles className="h-3 w-3" />}
                      {log.type === 'success' && <CheckCircle2 className="h-3 w-3" />}
                      {log.type === 'error' && <AlertCircle className="h-3 w-3" />}
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {log.message}
                    </div>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>

            {/* Console Footer Status */}
            <div className="bg-slate-900/50 border-t border-slate-800 px-4 py-2 text-[10px] text-slate-500 flex justify-between">
              <span>Model: gpt-5-chat</span>
              <span>Agents: Researcher, Advocate, Writer</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  )
}
