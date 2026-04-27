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
  const [activeTab, setActiveTab] = useState<'manual' | 'auto'>('manual')
  const [stats, setStats] = useState<{ total: number, completed: number, avg_score: number, recent_reviews: any[] } | null>(null)
  
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

  // Fetch stats periodically if in auto mode
  useEffect(() => {
    if (activeTab === 'auto') {
      fetchStats()
      const interval = setInterval(fetchStats, 10000)
      return () => clearInterval(interval)
    }
  }, [activeTab])

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:4002/manager/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }

  const startManager = async () => {
    setIsProcessing(true)
    setLogs([])
    addLog(`Đang khởi động Hệ điều hành Manager (Auto-Pilot)...`, 'status')

    try {
      const collectionId = "606c4b92-1207-49f5-b95a-13435f7055f1" 
      const response = await fetch('http://localhost:4002/manager/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection_id: collectionId })
      })

      const data = await response.json()
      
      if (data.log_id) {
        const eventSource = new EventSource(`http://localhost:4002/stream/${data.log_id}`)
        eventSourceRef.current = eventSource

        eventSource.addEventListener('log', (event) => {
          addLog(event.data, 'log')
        })

        eventSource.addEventListener('end', (event) => {
          addLog("Hệ điều hành Manager đã hoàn thành công việc!", 'success')
          setIsProcessing(false)
          fetchStats()
          eventSource.close()
        })

        eventSource.onerror = (error) => {
          setIsProcessing(false)
          eventSource.close()
        }
      }
    } catch (error) {
      addLog("Lỗi khi kết nối với AI Orchestrator.", "error")
      setIsProcessing(false)
    }
  }

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

  const startFixLinks = async (testMode: boolean = false) => {
    if (testMode && !selectedDoc) {
      addLog("Vui lòng chọn 1 bài viết ở tab Manual để chạy thử nghiệm.", "error")
      return
    }

    setIsProcessing(true)
    setLogs([])
    addLog(testMode ? `Đang chạy thử nghiệm sửa link cho: ${selectedDoc?.title}` : "Đang khởi động tiến trình sửa link toàn bộ hệ thống...", "status")

    try {
      const response = await fetch('http://localhost:4002/manager/fix-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          document_ids: testMode && selectedDoc ? [selectedDoc.id] : null
        })
      })

      const data = await response.json()
      
      if (data.log_id) {
        const eventSource = new EventSource(`http://localhost:4002/stream/${data.log_id}`)
        eventSourceRef.current = eventSource

        eventSource.addEventListener('log', (event) => {
          addLog(event.data, 'log')
        })

        eventSource.addEventListener('end', (event) => {
          addLog("Tiến trình sửa link đã hoàn thành!", 'success')
          setIsProcessing(false)
          eventSource.close()
        })

        eventSource.onerror = (error) => {
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">AI Docs Orchestrator</h1>
          <p className="text-muted-foreground">
            Hệ điều hành AI Agent tự động tối ưu hóa kho tài liệu Smax.
          </p>
        </div>
        
        <div className="flex p-1 bg-muted rounded-lg w-fit">
          <button 
            onClick={() => setActiveTab('manual')}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
              activeTab === 'manual' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Manual Editor
          </button>
          <button 
            onClick={() => setActiveTab('auto')}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2",
              activeTab === 'auto' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Bot className="h-4 w-4" />
            AI Manager
          </button>
        </div>
      </div>

      {activeTab === 'auto' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tổng tài liệu</div>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Đã hoàn thành</div>
            <div className="text-2xl font-bold text-green-500">{stats?.completed || 0}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Điểm chất lượng TB</div>
            <div className="text-2xl font-bold text-primary">{stats?.avg_score || 0}/10</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col gap-2">
            <Button 
              className="w-full gap-2" 
              onClick={startManager} 
              disabled={isProcessing}
              variant={isProcessing ? "outline" : "default"}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isProcessing ? "Đang chạy Auto-Pilot..." : "Kích hoạt Auto-Pilot"}
            </Button>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                size="sm"
                variant="outline"
                className="gap-2 text-[10px]"
                onClick={() => startFixLinks(true)}
                disabled={isProcessing}
              >
                <RefreshCcw className="h-3 w-3" />
                Test Link Fix
              </Button>
              <Button 
                size="sm"
                variant="secondary"
                className="gap-2 text-[10px]"
                onClick={() => startFixLinks(false)}
                disabled={isProcessing}
              >
                <Zap className="h-3 w-3" />
                Fix All Links
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Input & Controls */}
        <div className="lg:col-span-1 space-y-6">
          {activeTab === 'manual' ? (
            <>
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
            </>
          ) : (
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">
                <CheckCircle2 className="h-4 w-4" />
                Lịch sử duyệt bài (Gần đây)
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {stats?.recent_reviews && stats.recent_reviews.length > 0 ? (
                  stats.recent_reviews.map((rev: any) => (
                    <div key={rev.id} className="p-3 bg-muted/30 border border-border rounded-lg text-sm space-y-1">
                      <div className="font-medium truncate">{rev.title}</div>
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded",
                          rev.score >= 8 ? "bg-green-500/20 text-green-500" : "bg-amber-500/20 text-amber-500"
                        )}>
                          Score: {rev.score}/10
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(rev.last_run_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-muted-foreground italic">
                    Chưa có bài viết nào được duyệt
                  </div>
                )}
              </div>
            </div>
          )}
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar max-h-[600px]">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20 select-none py-20">
                  <Bot className="h-16 w-16 mb-4" />
                  <p>Sẵn sàng nhận lệnh từ bạn...</p>
                </div>
              ) : (
                logs.map((log, i) => {
                  const hasThought = log.message.includes('<thought>');
                  const parts = hasThought ? log.message.split(/(<thought>[\s\S]*?<\/thought>)/g) : [log.message];

                  return (
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
                        {parts.map((part, idx) => {
                          if (part.startsWith('<thought>') && part.endsWith('</thought>')) {
                            const thoughtContent = part.replace(/<\/?thought>/g, '').trim();
                            return (
                              <div key={idx} className="my-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 text-slate-400 italic text-xs leading-normal">
                                <div className="flex items-center gap-1.5 mb-1 opacity-60 not-italic font-bold uppercase tracking-tighter text-[9px]">
                                  <RefreshCcw className="h-3 w-3" />
                                  Internal Reasoning
                                </div>
                                {thoughtContent}
                              </div>
                            );
                          }
                          return <span key={idx}>{part}</span>;
                        })}
                      </div>
                    </div>
                  );
                })
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
