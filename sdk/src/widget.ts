// sdk/src/widget.ts
// Standalone chat widget - no React dependency

import { getUserId, clearUserId } from './fingerprint'

// Types
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

export interface WidgetConfig {
  apiBaseUrl?: string
  lang?: 'vi' | 'en'
  onOpen?: () => void
  onClose?: () => void
}

// Default config
const DEFAULT_CONFIG: Required<WidgetConfig> = {
  apiBaseUrl: 'https://docs.cdp.vn',
  lang: 'vi',
  onOpen: () => {},
  onClose: () => {}
}

// Widget class
export class SmaxAIChatWidget {
  private config: Required<WidgetConfig>
  private container: HTMLElement | null = null
  private isOpen = false
  private messages: Message[] = []
  private userId: string | null = null
  private isLoading = false
  private messageIdCounter = 0

  constructor(config: WidgetConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    // Create UI immediately, then load data async
    this.createUI()
    this.init()
  }

  private async init() {
    try {
      // Get user ID
      this.userId = await getUserId()
      
      // Load chat history
      await this.loadHistory()
      
      // Re-render messages if we have history
      if (this.messages.length > 0) {
        this.renderMessages()
      }
    } catch (error) {
      console.error('SmaxAI Chat: Init error:', error)
      // Widget still works, just without history
    }
  }

  private async loadHistory() {
    if (!this.userId) return

    try {
      const response = await fetch(
        `${this.config.apiBaseUrl}/api/chat/session?user_id=${this.userId}`
      )
      const data = await response.json()
      
      if (data.success && data.session?.messages) {
        this.messages = data.session.messages
      }
    } catch (error) {
      console.error('Failed to load chat history:', error)
    }
  }

  private async saveHistory() {
    if (!this.userId) return

    try {
      await fetch(`${this.config.apiBaseUrl}/api/chat/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: this.userId,
          messages: this.messages
        })
      })
    } catch (error) {
      console.error('Failed to save chat history:', error)
    }
  }

  private createUI() {
    // Create container
    this.container = document.createElement('div')
    this.container.id = 'smaxai-chat-widget'
    this.container.innerHTML = this.getHTML()
    
    // Inject styles
    this.injectStyles()
    
    // Add to page
    document.body.appendChild(this.container)
    
    // Bind events
    this.bindEvents()
  }

  private getHTML(): string {
    return `
      <div class="smaxai-widget">
        <!-- Floating button -->
        <button class="smaxai-trigger" aria-label="Open AI Assistant">
          <svg class="smaxai-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </button>
        
        <!-- Chat panel -->
        <div class="smaxai-panel">
          <div class="smaxai-header">
            <div class="smaxai-header-title">
              <svg class="smaxai-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
              <span>AI Assistant</span>
            </div>
            <div class="smaxai-header-actions">
              <button class="smaxai-clear-btn" title="Clear chat">Clear</button>
              <button class="smaxai-close-btn" title="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
          
          <div class="smaxai-messages">
            <div class="smaxai-empty">
              <div class="smaxai-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h3>Hỏi tôi bất cứ điều gì</h3>
              <p>Tôi có thể giúp bạn tìm hiểu về SmaxAI</p>
            </div>
          </div>
          
          <div class="smaxai-input-area">
            <input type="text" class="smaxai-input" placeholder="Nhập câu hỏi của bạn...">
            <button class="smaxai-send-btn" disabled>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `
  }

  private injectStyles() {
    if (document.getElementById('smaxai-styles')) return

    const styles = document.createElement('style')
    styles.id = 'smaxai-styles'
    styles.textContent = `
      .smaxai-widget {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .smaxai-trigger {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .smaxai-trigger:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 24px rgba(99, 102, 241, 0.5);
      }
      
      .smaxai-icon {
        width: 28px;
        height: 28px;
        color: white;
      }
      
      .smaxai-panel {
        position: absolute;
        bottom: 72px;
        right: 0;
        width: 400px;
        max-width: calc(100vw - 48px);
        height: 600px;
        max-height: calc(100vh - 120px);
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 40px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        opacity: 0;
        visibility: hidden;
        transform: translateY(20px) scale(0.95);
        transition: all 0.3s ease;
      }
      
      .smaxai-panel.open {
        opacity: 1;
        visibility: visible;
        transform: translateY(0) scale(1);
      }
      
      .smaxai-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        border-bottom: 1px solid #e5e7eb;
        background: #f9fafb;
      }
      
      .smaxai-header-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        font-size: 16px;
        color: #111827;
      }
      
      .smaxai-header-icon {
        width: 20px;
        height: 20px;
        color: #6366f1;
      }
      
      .smaxai-header-actions {
        display: flex;
        gap: 8px;
      }
      
      .smaxai-clear-btn {
        padding: 4px 12px;
        font-size: 13px;
        color: #6b7280;
        background: transparent;
        border: none;
        cursor: pointer;
        border-radius: 6px;
      }
      
      .smaxai-clear-btn:hover {
        background: #f3f4f6;
        color: #111827;
      }
      
      .smaxai-close-btn {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        cursor: pointer;
        border-radius: 8px;
        color: #6b7280;
      }
      
      .smaxai-close-btn:hover {
        background: #f3f4f6;
        color: #111827;
      }
      
      .smaxai-close-btn svg {
        width: 18px;
        height: 18px;
      }
      
      .smaxai-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }
      
      .smaxai-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        text-align: center;
        color: #6b7280;
      }
      
      .smaxai-empty-icon {
        width: 64px;
        height: 64px;
        background: #eef2ff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
      }
      
      .smaxai-empty-icon svg {
        width: 32px;
        height: 32px;
        color: #6366f1;
      }
      
      .smaxai-empty h3 {
        font-size: 18px;
        font-weight: 600;
        color: #111827;
        margin: 0 0 8px;
      }
      
      .smaxai-empty p {
        font-size: 14px;
        margin: 0;
      }
      
      .smaxai-message {
        display: flex;
        margin-bottom: 12px;
      }
      
      .smaxai-message.user {
        justify-content: flex-end;
      }
      
      .smaxai-message-content {
        max-width: 85%;
        padding: 10px 14px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.5;
      }
      
      .smaxai-message.user .smaxai-message-content {
        background: #6366f1;
        color: white;
        border-bottom-right-radius: 4px;
      }
      
      .smaxai-message.assistant .smaxai-message-content {
        background: #f3f4f6;
        color: #111827;
        border-bottom-left-radius: 4px;
      }
      
      .smaxai-input-area {
        display: flex;
        gap: 8px;
        padding: 16px;
        border-top: 1px solid #e5e7eb;
        background: #f9fafb;
      }
      
      .smaxai-input {
        flex: 1;
        padding: 12px 16px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;
      }
      
      .smaxai-input:focus {
        border-color: #6366f1;
      }
      
      .smaxai-send-btn {
        width: 44px;
        height: 44px;
        background: #6366f1;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }
      
      .smaxai-send-btn:hover:not(:disabled) {
        background: #4f46e5;
      }
      
      .smaxai-send-btn:disabled {
        background: #d1d5db;
        cursor: not-allowed;
      }
      
      .smaxai-send-btn svg {
        width: 20px;
        height: 20px;
        color: white;
      }
      
      .smaxai-loading {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #6b7280;
        font-size: 14px;
      }
      
      .smaxai-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #e5e7eb;
        border-top-color: #6366f1;
        border-radius: 50%;
        animation: smaxai-spin 0.8s linear infinite;
      }
      
      @keyframes smaxai-spin {
        to { transform: rotate(360deg); }
      }
      
      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .smaxai-panel {
          background: #1f2937;
        }
        
        .smaxai-header {
          background: #111827;
          border-bottom-color: #374151;
        }
        
        .smaxai-header-title {
          color: #f9fafb;
        }
        
        .smaxai-clear-btn:hover,
        .smaxai-close-btn:hover {
          background: #374151;
          color: #f9fafb;
        }
        
        .smaxai-empty-icon {
          background: #374151;
        }
        
        .smaxai-empty h3 {
          color: #f9fafb;
        }
        
        .smaxai-message.assistant .smaxai-message-content {
          background: #374151;
          color: #f9fafb;
        }
        
        .smaxai-input-area {
          background: #111827;
          border-top-color: #374151;
        }
        
        .smaxai-input {
          background: #374151;
          border-color: #4b5563;
          color: #f9fafb;
        }
        
        .smaxai-input:focus {
          border-color: #6366f1;
        }
      }
    `
    document.head.appendChild(styles)
  }

  private bindEvents() {
    if (!this.container) return

    const trigger = this.container.querySelector('.smaxai-trigger')
    const closeBtn = this.container.querySelector('.smaxai-close-btn')
    const clearBtn = this.container.querySelector('.smaxai-clear-btn')
    const input = this.container.querySelector('.smaxai-input') as HTMLInputElement
    const sendBtn = this.container.querySelector('.smaxai-send-btn')

    trigger?.addEventListener('click', () => this.toggle())
    closeBtn?.addEventListener('click', () => this.close())
    clearBtn?.addEventListener('click', () => this.clearChat())
    
    input?.addEventListener('input', () => {
      sendBtn?.toggleAttribute('disabled', !input.value.trim())
    })
    
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        this.sendMessage()
      }
    })
    
    sendBtn?.addEventListener('click', () => this.sendMessage())
  }

  public open() {
    if (!this.container) return
    const panel = this.container.querySelector('.smaxai-panel')
    panel?.classList.add('open')
    this.isOpen = true
    this.config.onOpen()
    
    // Focus input
    const input = this.container.querySelector('.smaxai-input') as HTMLInputElement
    input?.focus()
    
    // Render existing messages
    this.renderMessages()
  }

  public close() {
    if (!this.container) return
    const panel = this.container.querySelector('.smaxai-panel')
    panel?.classList.remove('open')
    this.isOpen = false
    this.config.onClose()
  }

  public toggle() {
    if (this.isOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  private async sendMessage() {
    if (!this.container || this.isLoading) return

    const input = this.container.querySelector('.smaxai-input') as HTMLInputElement
    const query = input?.value.trim()
    
    if (!query) return

    // Add user message
    const userMessage: Message = {
      id: `msg-${++this.messageIdCounter}`,
      role: 'user',
      content: query
    }
    this.messages.push(userMessage)
    
    // Clear input
    input.value = ''
    const sendBtn = this.container.querySelector('.smaxai-send-btn')
    sendBtn?.setAttribute('disabled', 'true')
    
    // Add assistant placeholder
    const assistantMessage: Message = {
      id: `msg-${++this.messageIdCounter}`,
      role: 'assistant',
      content: '',
      isStreaming: true
    }
    this.messages.push(assistantMessage)
    
    this.renderMessages()
    this.isLoading = true

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          lang: this.config.lang,
          history: this.messages.slice(-8, -2).map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      if (!response.ok) throw new Error('Failed to get response')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        if (chunk.includes('[DONE]')) break

        // Fix for missing first characters - ensure proper chunk handling
        const lines = chunk.split('\n').filter(line => line.trim() !== '')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            
            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content || ''
              if (content) {
                fullContent += content
                assistantMessage.content = fullContent
                this.renderMessages()
              }
            } catch {
              // Skip invalid JSON chunks
            }
          } else if (line.trim() && !line.startsWith('data:')) {
            // Handle direct text chunks
            fullContent += line
            assistantMessage.content = fullContent
            this.renderMessages()
          }
        }
      }

      assistantMessage.isStreaming = false
      this.saveHistory()

    } catch (error) {
      console.error('Chat error:', error)
      assistantMessage.content = 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.'
      assistantMessage.isStreaming = false
    } finally {
      this.isLoading = false
      this.renderMessages()
    }
  }

  private renderMessages() {
    if (!this.container) return

    const messagesContainer = this.container.querySelector('.smaxai-messages')
    if (!messagesContainer) return

    if (this.messages.length === 0) {
      messagesContainer.innerHTML = `
        <div class="smaxai-empty">
          <div class="smaxai-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h3>Hỏi tôi bất cứ điều gì</h3>
          <p>Tôi có thể giúp bạn tìm hiểu về SmaxAI</p>
        </div>
      `
      return
    }

    messagesContainer.innerHTML = this.messages.map(msg => `
      <div class="smaxai-message ${msg.role}">
        <div class="smaxai-message-content">
          ${msg.isStreaming && !msg.content ? `
            <div class="smaxai-loading">
              <div class="smaxai-spinner"></div>
              <span>Đang suy nghĩ...</span>
            </div>
          ` : this.escapeHtml(msg.content)}
        </div>
      </div>
    `).join('')

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML.replace(/\n/g, '<br>')
  }

  public async clearChat() {
    this.messages = []
    this.messageIdCounter = 0
    clearUserId()
    this.userId = await getUserId()
    this.renderMessages()
    
    // Clear from server
    if (this.userId) {
      await fetch(`${this.config.apiBaseUrl}/api/chat/session?user_id=${this.userId}`, {
        method: 'DELETE'
      })
    }
  }

  public destroy() {
    this.container?.remove()
    document.getElementById('smaxai-styles')?.remove()
  }
}