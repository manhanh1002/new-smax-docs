/**
 * Hook: use-chat-history
 * 
 * Quản lý lịch sử chat với localStorage persistence
 * - Tự động lưu mỗi khi có message mới
 * - Tự động tải khi component mount
 * - Giới hạn số lượng messages để tránh quá tải localStorage
 */

import { useState, useEffect, useCallback } from 'react'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: number
}

interface ChatHistory {
  messages: ChatMessage[]
  lastUpdated: string
}

// Configuration
const STORAGE_KEY = 'smax-chat-history'
const MAX_MESSAGES = 50 // Giới hạn số lượng messages
const EXPIRATION_DAYS = 7 // Xóa history sau 7 ngày không dùng

/**
 * Hook để quản lý lịch sử chat với localStorage persistence
 */
export function useChatHistory() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load messages from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const history: ChatHistory = JSON.parse(stored)
        
        // Check expiration
        const lastUpdated = new Date(history.lastUpdated)
        const now = new Date()
        const daysDiff = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
        
        if (daysDiff > EXPIRATION_DAYS) {
          // Expired, clear history
          console.log('[ChatHistory] History expired, clearing...')
          localStorage.removeItem(STORAGE_KEY)
        } else {
          // Load valid history
          setMessages(history.messages || [])
          console.log(`[ChatHistory] Loaded ${history.messages?.length || 0} messages from localStorage`)
        }
      }
    } catch (error) {
      console.error('[ChatHistory] Error loading from localStorage:', error)
      // Clear corrupted data
      localStorage.removeItem(STORAGE_KEY)
    }
    setIsLoaded(true)
  }, [])

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (!isLoaded) return // Don't save on initial load
    
    try {
      if (messages.length === 0) {
        localStorage.removeItem(STORAGE_KEY)
        return
      }

      // Limit messages to prevent localStorage overflow
      const messagesToSave = messages.slice(-MAX_MESSAGES)
      
      const history: ChatHistory = {
        messages: messagesToSave,
        lastUpdated: new Date().toISOString()
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
      console.log(`[ChatHistory] Saved ${messagesToSave.length} messages to localStorage`)
    } catch (error) {
      console.error('[ChatHistory] Error saving to localStorage:', error)
      // If quota exceeded, try to save fewer messages
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        try {
          const fewerMessages = messages.slice(-20)
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            messages: fewerMessages,
            lastUpdated: new Date().toISOString()
          }))
          console.log('[ChatHistory] Saved reduced history (20 messages)')
        } catch {
          console.error('[ChatHistory] Cannot save even reduced history')
        }
      }
    }
  }, [messages, isLoaded])

  // Add a new message
  const addMessage = useCallback((message: Omit<ChatMessage, 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      timestamp: Date.now()
    }
    setMessages(prev => [...prev, newMessage])
    return newMessage
  }, [])

  // Update an existing message (for streaming)
  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => prev.map(m => 
      m.id === id ? { ...m, ...updates } : m
    ))
  }, [])

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
    console.log('[ChatHistory] Cleared all messages')
  }, [])

  // Get messages formatted for API (without id and timestamp)
  const getHistoryForAPI = useCallback((limit: number = 6) => {
    return messages
      .slice(-limit)
      .map(m => ({
        role: m.role,
        content: m.content
      }))
  }, [messages])

  // Check if this is a new user (no history)
  const isNewUser = messages.length === 0

  // Add welcome message for new users
  const addWelcomeMessage = useCallback(() => {
    if (messages.length > 0) return // Already has history
    
    const welcomeMessage: ChatMessage = {
      id: `msg-welcome-${Date.now()}`,
      role: 'assistant',
      content: `👋 Xin chào! Tôi là **Trợ lý SmaxAI**.

Tôi có thể giúp bạn:
- ✨ Tìm hiểu về các **tính năng** của SmaxAI
- 📖 Đọc **hướng dẫn cài đặt** và sử dụng
- 🔧 **Khắc phục sự cố** kỹ thuật
- 💡 So sánh các **kênh kết nối** (Zalo, Facebook, Telegram...)

Bạn muốn biết điều gì?`,
      timestamp: Date.now()
    }
    
    setMessages([welcomeMessage])
    return welcomeMessage
  }, [messages.length])

  return {
    messages,
    setMessages,
    addMessage,
    updateMessage,
    clearMessages,
    getHistoryForAPI,
    addWelcomeMessage,
    isLoaded,
    isNewUser,
    messageCount: messages.length
  }
}
