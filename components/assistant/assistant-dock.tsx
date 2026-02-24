"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowUp, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarkdownRenderer } from "@/components/docs/markdown-renderer"

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

export function AssistantDock() {
  const [query, setQuery] = useState("")
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageIdCounter = useRef(0)

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

    const userMessage: Message = {
      id: `msg-${++messageIdCounter.current}`,
      role: 'user',
      content: query.trim()
    }

    const assistantMessage: Message = {
      id: `msg-${++messageIdCounter.current}`,
      role: 'assistant',
      content: '',
      isStreaming: true
    }

    setMessages(prev => [...prev, userMessage, assistantMessage])
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
          history: messages.slice(-6).map(m => ({
            role: m.role,
            content: m.content
          }))
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
        setMessages(prev => prev.map(m => 
          m.id === assistantMessage.id 
            ? { ...m, content: fullContent }
            : m
        ))
      }

      // Mark streaming as complete
      setMessages(prev => prev.map(m => 
        m.id === assistantMessage.id 
          ? { ...m, isStreaming: false }
          : m
      ))

    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => prev.map(m => 
        m.id === assistantMessage.id 
          ? { ...m, content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.', isStreaming: false }
          : m
      ))
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

  const clearChat = () => {
    setMessages([])
    setIsExpanded(false)
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:left-64"
      style={{
        transform: isVisible ? "translateY(0)" : "translateY(calc(100% + 16px))",
        transition: "transform 0.5s ease-in-out",
      }}
    >
      <div className="mx-auto max-w-2xl">
        {/* Expanded chat panel */}
        {isExpanded && messages.length > 0 && (
          <div className="mb-2 max-h-[50vh] overflow-y-auto rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Trò chuyện với AI</span>
              <Button variant="ghost" size="sm" onClick={clearChat} className="h-7 px-2">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {message.content ? (
                          <MarkdownRenderer content={message.content} />
                        ) : (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-muted-foreground">Đang suy nghĩ...</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Input area */}
        <div
          role="search"
          aria-label="Ask AI assistant"
          className="relative rounded-2xl border border-border bg-card/95 p-1 shadow-2xl backdrop-blur-sm"
        >
          <div className="flex items-center gap-2">
            <label htmlFor="assistant-input" className="sr-only">
              Ask a question
            </label>
            <input
              id="assistant-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question..."
              disabled={isLoading}
              className="min-h-[44px] flex-1 bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
            />
            <div className="flex items-center gap-2 pr-2">
              <kbd className="hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
                ⌘I
              </kbd>
              <Button
                size="icon"
                className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-lg"
                disabled={!query.trim() || isLoading}
                onClick={sendMessage}
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}