"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowUp, Loader2, X, Sparkles, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MarkdownRenderer } from "@/components/docs/markdown-renderer"
import { useChatHistory } from "@/hooks/use-chat-history"

export function AssistantDock() {
  const [query, setQuery] = useState("")
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageIdCounter = useRef(0)

  // Use the chat history hook for localStorage persistence
  const { 
    messages, 
    addMessage, 
    updateMessage, 
    clearMessages, 
    getHistoryForAPI,
    addWelcomeMessage,
    isLoaded,
    isNewUser
  } = useChatHistory()

  // Show welcome message when opening chat for the first time
  useEffect(() => {
    if (isLoaded && isExpanded && isNewUser) {
      addWelcomeMessage()
    }
  }, [isLoaded, isExpanded, isNewUser, addWelcomeMessage])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      if (currentScrollY < lastScrollY) {
        setIsVisible(true)
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY])

  const sendMessage = async () => {
    if (!query.trim() || isLoading) return

    const userMessage = addMessage({
      id: `msg-${++messageIdCounter.current}`,
      role: 'user',
      content: query.trim()
    })

    const assistantMessage = addMessage({
      id: `msg-${++messageIdCounter.current}`,
      role: 'assistant',
      content: '',
    })

    setQuery("")
    setIsLoading(true)
    setIsExpanded(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage.content,
          lang: 'vi',
          history: getHistoryForAPI(6)
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader available')

      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        
        // Check for done signal
        if (chunk.includes('[DONE]')) {
          break
        }

        fullContent += chunk

        // Update the assistant message
        updateMessage(assistantMessage.id, { content: fullContent })
      }

    } catch (error) {
      console.error('Chat error:', error)
      updateMessage(assistantMessage.id, { 
        content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleClearChat = () => {
    if (confirm('Bạn có chắc muốn xóa toàn bộ lịch sử chat?')) {
      clearMessages()
      setIsExpanded(false)
    }
  }

  if (!isVisible) return null

  // Don't render until loaded from localStorage
  if (!isLoaded) return null

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-4 max-w-[calc(100vw-3rem)]">
      {isExpanded && (
        <div className="w-[400px] max-w-full rounded-2xl border border-border bg-card shadow-xl overflow-hidden flex flex-col max-h-[600px] animate-in fade-in slide-in-from-bottom-10">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-4 bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">SmaxAI Assistant</h3>
                <p className="text-xs text-muted-foreground">Hỏi tôi về tài liệu Smax...</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={handleClearChat}
                  title="Xóa lịch sử chat"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsExpanded(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center p-4 text-muted-foreground">
                <Sparkles className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">Xin chào! Tôi có thể giúp gì cho bạn?</p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col max-w-[85%] space-y-1",
                  msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2 text-sm",
                    msg.role === 'user'
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted rounded-tl-none"
                  )}
                >
                  {msg.role === 'assistant' ? (
                    <MarkdownRenderer content={msg.content} />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border bg-background">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                sendMessage()
              }}
              className="relative"
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Đặt câu hỏi..."
                className="w-full rounded-full border border-border bg-muted/50 pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!query.trim() || isLoading}
                className={cn(
                  "absolute right-1 top-1 h-8 w-8 rounded-full transition-all",
                  query.trim() ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted"
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Button */}
      {!isExpanded && (
        <Button
          onClick={() => setIsExpanded(true)}
          className="h-14 w-14 rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-all duration-300"
          size="icon"
        >
          <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
          <Sparkles className="h-6 w-6 relative z-10" />
        </Button>
      )}
    </div>
  )
}