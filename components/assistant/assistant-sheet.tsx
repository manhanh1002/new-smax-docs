"use client"

import { useState, useEffect, useRef } from "react"
import { X, ArrowUp, Sparkles, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { MarkdownRenderer } from "@/components/docs/markdown-renderer"
import { useChatHistory } from "@/hooks/use-chat-history"

import { useLanguage } from "@/lib/context/language-context"
import { dictionaries } from "@/lib/i18n/dictionaries"
import { trackAIChat as trackGA } from "@/lib/google-analytics"
import { trackAnalyticsEvent } from "@/lib/actions/admin"

interface AssistantSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssistantSheet({ open, onOpenChange }: AssistantSheetProps) {
  const { language } = useLanguage()
  const t = dictionaries[language]
  
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Generate unique message ID using timestamp + random
  const generateMessageId = () => {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

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
    if (isLoaded && open && isNewUser) {
      addWelcomeMessage()
    }
  }, [isLoaded, open, isNewUser, addWelcomeMessage])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const sendMessage = async () => {
    if (!query.trim() || isLoading) return

    const userMessage = addMessage({
      id: generateMessageId(),
      role: 'user',
      content: query.trim()
    })

    const assistantMessage = addMessage({
      id: generateMessageId(),
      role: 'assistant',
      content: '',
    })

    setQuery("")
    setIsLoading(true)
    trackGA(messages.length + 1, language)
    trackAnalyticsEvent('ai_chat', { message_count: messages.length + 1, language })

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage.content,
          lang: language,
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
    if (confirm(t.assistant.clearConfirm || 'Bạn có chắc muốn xóa toàn bộ lịch sử chat?')) {
      clearMessages()
    }
  }

  // Don't render until loaded from localStorage
  if (!isLoaded) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        hideCloseButton
        className="flex w-full sm:w-[450px] sm:max-w-[90vw] flex-col gap-0 p-0"
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <SheetTitle className="font-medium text-base">{t.assistant.title}</SheetTitle>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={handleClearChat}
                title={t.assistant.clearHistory || "Xóa lịch sử chat"}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 flex-col min-h-0">
          {/* Chat messages area */}
          <div className="flex-1 overflow-y-auto py-4 px-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="rounded-full bg-primary/10 p-4 mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">{t.assistant.askAnything}</h3>
                <p className="text-sm text-muted-foreground">
                  {t.assistant.description}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2 break-words overflow-hidden ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
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
            )}
          </div>

          <div className="border-t border-border/50 p-4">
            <div className="flex items-center gap-2">
              <Input 
                placeholder={t.assistant.placeholder} 
                className="flex-1 bg-secondary/50 border-border/50" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
              <Button 
                size="icon" 
                className="shrink-0"
                disabled={!query.trim() || isLoading}
                onClick={sendMessage}
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
      </SheetContent>
    </Sheet>
  )
}