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
  onOpen: () => { },
  onClose: () => { }
}

// ============================================================================
// MARKDOWN PARSER  (vanilla JS – no React dependency)
// ============================================================================

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Render inline markdown: **bold**, *italic*, `code`, [link](url), ![img](url)
function renderInlineMarkdown(text: string): string {
  // Bold **text**
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  // Italic *text*
  text = text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>')

  // Inline code `code`
  text = text.replace(/`([^`]+)`/g, '<code class="smaxai-inline-code">$1</code>')

  // Links [text](url)
  text = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, label, href) => {
      const external = href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''
      return `<a class="smaxai-md-link" href="${href}"${external}>${label}</a>`
    }
  )

  return text
}

// Parse markdown content into an HTML string (assistant messages only)
function parseMarkdown(content: string): string {
  if (!content) return ''

  // ── Pre-process Thinking Tags ──────────────────────────────────────────
  const thinkingMatch = content.match(/\[THINKING\]([\s\S]*?)(?:\[\/THINKING\]|$)/i)
  let thinkingHtml = ''
  if (thinkingMatch) {
    const thinkingText = thinkingMatch[1].trim()
    const isComplete = content.match(/\[\/THINKING\]/i)
    
    // We create a separate parse string for the body, but recursively parsing it might re-trigger if not careful.
    // But since we extract it, we'll parse it separately and concatenate.
    let parsedBody = ''
    if (thinkingText) {
      // Split into lines and parse inline just for simplicity or reuse full parser
      const lines = thinkingText.split('\n')
      parsedBody = lines.map(l => `<p class="smaxai-md-p smaxai-md-thinking-text">${renderInlineMarkdown(escapeHtml(l))}</p>`).join('')
    }

    thinkingHtml = `
      <details class="smaxai-md-thinking">
        <summary class="smaxai-md-thinking-summary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          Suy nghĩ của AI ${!isComplete ? '<span class="smaxai-loading-dots"><span></span><span></span><span></span></span>' : ''}
        </summary>
        <div class="smaxai-md-thinking-body">
          ${parsedBody}
        </div>
      </details>
    `
    // Remove it from standard parsing stream
    content = content.replace(/\[THINKING\][\s\S]*?(?:\[\/THINKING\]|$)/i, '')
  }
  
  // Add answer tag stripping
  content = content.replace(/\[\/?ANSWER\]/gi, '')


  const lines = content.split('\n')
  const htmlParts: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Empty line
    if (line.trim() === '') {
      i++
      continue
    }

    // ── Callout :::type[title] ... ::: ──────────────────────────────────
    if (line.startsWith(':::')) {
      const match = line.match(/^:::(info|warning|tip|danger|note|success)(?:\s+\[([^\]]*)\])?\s*$/)
      if (match) {
        const type = match[1]
        const title = match[2] || ''
        const calloutLines: string[] = []
        i++
        while (i < lines.length && !lines[i].startsWith(':::')) {
          calloutLines.push(lines[i])
          i++
        }
        const body = parseMarkdown(calloutLines.join('\n'))
        const icon =
          type === 'warning' || type === 'danger' ? '&#9888;' :
          type === 'tip' || type === 'success' ? '&#10003;' : '&#8505;'
        htmlParts.push(
          `<div class="smaxai-md-callout smaxai-md-callout-${type}">` +
          `<span class="smaxai-md-callout-icon">${icon}</span>` +
          `<div class="smaxai-md-callout-body">` +
          (title ? `<div class="smaxai-md-callout-title">${escapeHtml(title)}</div>` : '') +
          `<div class="smaxai-md-callout-content">${body}</div>` +
          `</div></div>`
        )
        i++ // skip closing :::
        continue
      }
    }

    // ── Heading # ────────────────────────────────────────────────────────
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2].trim()
      htmlParts.push(`<h${level} class="smaxai-md-h${level}">${renderInlineMarkdown(text)}</h${level}>`)
      i++
      continue
    }

    // ── Code block ```language ────────────────────────────────────────────
    if (line.startsWith('```')) {
      const language = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      const code = escapeHtml(codeLines.join('\n'))
      htmlParts.push(
        `<div class="smaxai-md-code-block">` +
        (language ? `<div class="smaxai-md-code-lang">${escapeHtml(language)}</div>` : '') +
        `<pre class="smaxai-md-pre"><code>${code}</code></pre>` +
        `</div>`
      )
      i++ // skip closing ```
      continue
    }

    // ── HR ────────────────────────────────────────────────────────────────
    if (line.match(/^(-{3,}|\*{3,}|_{3,})\s*$/) || line.trim() === '---' || line.trim() === '***') {
      htmlParts.push('<hr class="smaxai-md-hr">')
      i++
      continue
    }

    // ── Blockquote > ──────────────────────────────────────────────────────
    if (line.startsWith('> ')) {
      const quoteLines: string[] = []
      while (i < lines.length && (lines[i].startsWith('> ') || lines[i].trim() === '')) {
        if (lines[i].startsWith('> ')) quoteLines.push(lines[i].slice(2))
        else quoteLines.push('')
        i++
      }
      htmlParts.push(`<blockquote class="smaxai-md-blockquote">${parseMarkdown(quoteLines.join('\n'))}</blockquote>`)
      continue
    }

    // ── Unordered list - / * / + ──────────────────────────────────────────
    if (/^[-*+]\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+]\s/, ''))
        i++
      }
      const itemsHtml = items.map(item => `<li>${renderInlineMarkdown(escapeHtml(item))}</li>`).join('')
      htmlParts.push(`<ul class="smaxai-md-ul">${itemsHtml}</ul>`)
      continue
    }

    // ── Ordered list 1. ──────────────────────────────────────────────────
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''))
        i++
      }
      const itemsHtml = items.map(item => `<li>${renderInlineMarkdown(escapeHtml(item))}</li>`).join('')
      htmlParts.push(`<ol class="smaxai-md-ol">${itemsHtml}</ol>`)
      continue
    }

    // ── Image ![alt](url) – standalone line ───────────────────────────────
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/)
    if (imgMatch) {
      htmlParts.push(
        `<div class="smaxai-md-img-wrap">` +
        `<img class="smaxai-md-img" src="${imgMatch[2]}" alt="${escapeHtml(imgMatch[1])}" loading="lazy">` +
        (imgMatch[1] ? `<div class="smaxai-md-img-caption">${escapeHtml(imgMatch[1])}</div>` : '') +
        `</div>`
      )
      i++
      continue
    }

    // ── Table ─────────────────────────────────────────────────────────────
    if (line.includes('|') && i + 1 < lines.length && lines[i + 1].match(/^\|?[\s\-:|]+\|?$/)) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i])
        i++
      }
      const rows = tableLines
        .filter(l => !l.match(/^\|?[\s\-:|]+\|?$/))
        .map(row => row.split('|').map(cell => cell.trim()).filter((_, ci) => ci > 0 && ci < row.split('|').length - 1))

      if (rows.length > 0) {
        const headerCells = rows[0].map(cell => `<th>${renderInlineMarkdown(escapeHtml(cell))}</th>`).join('')
        const bodyRows = rows.slice(1).map(row =>
          `<tr>${row.map(cell => `<td>${renderInlineMarkdown(escapeHtml(cell))}</td>`).join('')}</tr>`
        ).join('')
        htmlParts.push(
          `<div class="smaxai-md-table-wrap">` +
          `<table class="smaxai-md-table">` +
          `<thead><tr>${headerCells}</tr></thead>` +
          `<tbody>${bodyRows}</tbody>` +
          `</table></div>`
        )
      }
      continue
    }

    // ── Default: paragraph ────────────────────────────────────────────────
    htmlParts.push(`<p class="smaxai-md-p">${renderInlineMarkdown(escapeHtml(line))}</p>`)
    i++
  }

  return thinkingHtml + htmlParts.join('')
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
    // Wait for body to be available if needed
    if (!document.body) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.createUI())
      } else {
        // Fallback for weird environments
        setTimeout(() => this.createUI(), 100)
      }
      return
    }

    // Check if already created (avoid duplicates if init is called twice manually)
    if (document.getElementById('smaxai-chat-widget')) return

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
          <div class="smaxai-trigger-ping"></div>
          <svg class="smaxai-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>
          </svg>
        </button>
        
        <!-- Chat panel -->
        <div class="smaxai-panel">
          <div class="smaxai-header">
            <div class="smaxai-header-left">
              <div class="smaxai-header-avatar">
                <svg class="smaxai-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>
                </svg>
              </div>
              <div class="smaxai-header-titles">
                <h3 class="smaxai-header-title">SmaxAI Assistant</h3>
                <p class="smaxai-header-subtitle">Hỏi tôi về tài liệu Smax...</p>
              </div>
            </div>
            <div class="smaxai-header-actions">
              <button class="smaxai-clear-btn" title="Xóa lịch sử">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
              </button>
              <button class="smaxai-close-btn" title="Đóng">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
          
          <div class="smaxai-messages"></div>
          
          <div class="smaxai-input-area">
            <form class="smaxai-input-form">
              <input type="text" class="smaxai-input" placeholder="Đặt câu hỏi...">
              <button type="submit" class="smaxai-send-btn" disabled>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 7-7 7 7M12 19V5"/></svg>
              </button>
            </form>
          </div>
        </div>

        <!-- Image Viewer HTML -->
        <div class="smaxai-image-viewer">
          <button class="smaxai-image-viewer-close" title="Đóng">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
          <img class="smaxai-image-viewer-img" src="" alt="Phóng to">
        </div>
      </div>
    `
  }

  private injectStyles() {
    if (document.getElementById('smaxai-styles')) return

    const styles = document.createElement('style')
    styles.id = 'smaxai-styles'
    styles.textContent = `
                  .smaxai-widget { position: fixed; bottom: 24px; right: 24px; z-index: 9999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      .smaxai-trigger { width: 56px; height: 56px; border-radius: 9999px; background: #FB6E5C; color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.2); transition: transform 0.3s; position: relative; }
      .smaxai-trigger:hover { transform: scale(1.05); }
      .smaxai-trigger-ping { position: absolute; inset: 0; border-radius: 9999px; background: inherit; opacity: 0.2; animation: smaxai-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
      @keyframes smaxai-ping { 75%, 100% { transform: scale(2); opacity: 0; } }
      .smaxai-icon { width: 24px; height: 24px; position: relative; z-index: 10; }
      .smaxai-panel { position: absolute; bottom: 72px; right: 0; width: 400px; max-width: calc(100vw - 48px); height: 600px; max-height: calc(100vh - 120px); background: #ffffff; border: 1px solid #e2e8f0; border-radius: 1rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); display: flex; flex-direction: column; overflow: hidden; opacity: 0; visibility: hidden; transform: translateY(20px) scale(0.95); transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      .smaxai-panel.open { opacity: 1; visibility: visible; transform: translateY(0) scale(1); }
      .smaxai-header { display: flex; align-items: center; justify-content: space-between; padding: 16px; border-bottom: 1px solid #e2e8f0; background: rgba(241, 245, 249, 0.3); }
      .smaxai-header-left { display: flex; align-items: center; gap: 8px; }
      .smaxai-header-avatar { display: flex; height: 32px; width: 32px; align-items: center; justify-content: center; border-radius: 9999px; background: rgba(251, 110, 92, 0.1); color: #FB6E5C; }
      .smaxai-header-icon { width: 16px; height: 16px; }
      .smaxai-header-titles { display: flex; flex-direction: column; }
      .smaxai-header-title { font-size: 14px; font-weight: 600; color: #0f172a; margin: 0; }
      .smaxai-header-subtitle { font-size: 12px; color: #64748b; margin: 0; }
      .smaxai-header-actions { display: flex; gap: 4px; align-items: center; }
      .smaxai-clear-btn, .smaxai-close-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: transparent; border: none; border-radius: 6px; cursor: pointer; color: #64748b; transition: all 0.2s; }
      .smaxai-clear-btn:hover { color: #ef4444; background: #f1f5f9; }
      .smaxai-close-btn:hover { color: #0f172a; background: #f1f5f9; }
      .smaxai-clear-btn svg, .smaxai-close-btn svg { width: 16px; height: 16px; }
      .smaxai-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 16px; }
      .smaxai-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; color: #64748b; padding: 16px; }
      .smaxai-empty-icon { width: 32px; height: 32px; margin-bottom: 8px; opacity: 0.2; color: #FB6E5C; }
      .smaxai-empty-icon svg { width: 100%; height: 100%; }
      .smaxai-empty h3 { font-size: 14px; font-weight: 400; margin: 0; }
      .smaxai-message { display: flex; flex-direction: column; max-width: 85%; }
      .smaxai-message.user { align-self: flex-end; align-items: flex-end; }
      .smaxai-message.assistant { align-self: flex-start; align-items: flex-start; }
      .smaxai-message-content { padding: 8px 16px; font-size: 14px; line-height: 1.5; border-radius: 16px; word-break: break-word; }
      .smaxai-message.user .smaxai-message-content { background: #FB6E5C; color: white; border-top-right-radius: 0; }
      .smaxai-message.assistant .smaxai-message-content { background: #f1f5f9; color: #111827; border-top-left-radius: 0; }
      .smaxai-loading { display: flex; align-items: center; gap: 8px; color: #6b7280; font-size: 14px; padding: 4px 0; }
      .smaxai-spinner { width: 16px; height: 16px; border: 2px solid #e2e8f0; border-top-color: #FB6E5C; border-radius: 50%; animation: smaxai-spin 0.8s linear infinite; }
      @keyframes smaxai-spin { to { transform: rotate(360deg); } }
      .smaxai-input-area { padding: 16px; border-top: 1px solid #e2e8f0; background: #ffffff; }
      .smaxai-input-form { display: flex; position: relative; margin: 0; }
      .smaxai-input { width: 100%; padding: 10px 48px 10px 16px; border: 1px solid #e2e8f0; border-radius: 9999px; font-size: 14px; background: rgba(241, 245, 249, 0.5); outline: none; transition: all 0.2s; }
      .smaxai-input:focus { border-color: transparent; box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.2); }
      .smaxai-send-btn { position: absolute; right: 4px; top: 4px; bottom: 4px; width: 32px; height: 32px; border-radius: 9999px; background: transparent; color: #64748b; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
      .smaxai-send-btn:not(:disabled) { background: #FB6E5C; color: white; }
      .smaxai-send-btn:disabled { cursor: not-allowed; opacity: 0.5; }
      .smaxai-send-btn svg { width: 16px; height: 16px; }
      
      .smaxai-md-thinking { margin: 8px 0; background: #fffcf8; border: 1px solid #ffd8a8; border-radius: 8px; overflow: hidden; }
      .smaxai-md-thinking-summary { display: flex; align-items: center; gap: 8px; padding: 10px 12px; font-weight: 500; font-size: 13px; color: #ea580c; cursor: pointer; user-select: none; list-style: none; }
      .smaxai-md-thinking-summary::-webkit-details-marker { display: none; }
      .smaxai-md-thinking-summary svg { width: 14px; height: 14px; }
      .smaxai-md-thinking-body { padding: 0 12px 12px; font-size: 13px; color: #475569; border-top: 1px solid #ffd8a8; }
      .smaxai-md-thinking[open] .smaxai-md-thinking-body { display: block; }
      .smaxai-md-thinking-text { margin: 4px 0; }

      
      /* Image Viewer */
      .smaxai-image-viewer { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.9); z-index: 10000; display: flex; align-items: center; justify-content: center; opacity: 0; visibility: hidden; transition: all 0.3s ease; backdrop-filter: blur(4px); }
      .smaxai-image-viewer.open { opacity: 1; visibility: visible; }
      .smaxai-image-viewer-img { max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 8px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); transform: scale(0.95); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      .smaxai-image-viewer.open .smaxai-image-viewer-img { transform: scale(1); }
      .smaxai-image-viewer-close { position: absolute; top: 24px; right: 24px; width: 48px; height: 48px; border-radius: 50%; background: rgba(255, 255, 255, 0.1); border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
      .smaxai-image-viewer-close:hover { background: rgba(255, 255, 255, 0.2); }
      .smaxai-image-viewer-close svg { width: 24px; height: 24px; }
      .smaxai-md-img { cursor: zoom-in; }

      /* ── Markdown content (assistant messages) ─────────────────────────── */
      .smaxai-md { font-size: 14px; line-height: 1.6; }

      .smaxai-md h1 { font-size: 1.35em; font-weight: 700; margin: 12px 0 6px; }
      .smaxai-md h2 { font-size: 1.2em; font-weight: 600; margin: 10px 0 5px; }
      .smaxai-md h3 { font-size: 1.1em; font-weight: 600; margin: 8px 0 4px; }
      .smaxai-md h4 { font-size: 1em; font-weight: 600; margin: 6px 0 3px; }

      .smaxai-md-p { margin: 4px 0; }

      .smaxai-md-link { color: #6366f1; text-decoration: underline; }
      .smaxai-inline-code {
        font-family: 'Courier New', monospace;
        font-size: 0.88em;
        background: rgba(99, 102, 241, 0.1);
        border-radius: 4px;
        padding: 1px 5px;
        color: #4f46e5;
      }

      /* Code block */
      .smaxai-md-code-block {
        position: relative;
        margin: 8px 0;
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid #e5e7eb;
        background: #f8f9fa;
      }
      .smaxai-md-code-lang {
        padding: 4px 12px;
        font-size: 11px;
        font-family: monospace;
        color: #9ca3af;
        background: #eef2ff;
        border-bottom: 1px solid #e5e7eb;
      }
      .smaxai-md-pre {
        margin: 0;
        padding: 12px;
        overflow-x: auto;
        font-size: 13px;
        font-family: 'Courier New', monospace;
        line-height: 1.5;
        color: #374151;
      }
      .smaxai-md-pre code { font-family: inherit; }

      /* Lists */
      .smaxai-md-ul, .smaxai-md-ol {
        margin: 6px 0;
        padding-left: 24px;
      }
      .smaxai-md-ul { list-style: disc; }
      .smaxai-md-ol { list-style: decimal; }
      .smaxai-md-ul li, .smaxai-md-ol li { margin: 2px 0; }

      /* Blockquote */
      .smaxai-md-blockquote {
        border-left: 3px solid #6366f1;
        margin: 6px 0;
        padding: 4px 10px;
        background: rgba(99, 102, 241, 0.05);
        border-radius: 0 6px 6px 0;
        font-style: italic;
      }

      /* HR */
      .smaxai-md-hr {
        border: none;
        border-top: 1px solid #e5e7eb;
        margin: 10px 0;
      }

      /* Image */
      .smaxai-md-img-wrap { margin: 8px 0; text-align: center; }
      .smaxai-md-img {
        max-width: 100%;
        max-height: 280px;
        border-radius: 8px;
        object-fit: contain;
      }
      .smaxai-md-img-caption {
        font-size: 12px;
        color: #9ca3af;
        margin-top: 4px;
      }

      /* Table */
      .smaxai-md-table-wrap { overflow-x: auto; margin: 8px 0; }
      .smaxai-md-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      .smaxai-md-table th {
        background: #eef2ff;
        font-weight: 600;
        padding: 6px 10px;
        text-align: left;
        border: 1px solid #e5e7eb;
      }
      .smaxai-md-table td {
        padding: 5px 10px;
        border: 1px solid #e5e7eb;
        color: #374151;
      }
      .smaxai-md-table tr:nth-child(even) td { background: #f9fafb; }

      /* Callout */
      .smaxai-md-callout {
        display: flex;
        gap: 8px;
        margin: 8px 0;
        padding: 10px 12px;
        border-radius: 8px;
        border-left: 4px solid;
        font-size: 13.5px;
      }
      .smaxai-md-callout-icon { font-size: 1em; flex-shrink: 0; line-height: 1.5; }
      .smaxai-md-callout-body { flex: 1; min-width: 0; }
      .smaxai-md-callout-title { font-weight: 600; margin-bottom: 4px; }
      .smaxai-md-callout-content p { margin: 2px 0; }

      .smaxai-md-callout-info    { background: #eff6ff; border-color: #3b82f6; color: #1e40af; }
      .smaxai-md-callout-warning { background: #fffbeb; border-color: #f59e0b; color: #92400e; }
      .smaxai-md-callout-tip     { background: #f0fdf4; border-color: #22c55e; color: #166534; }
      .smaxai-md-callout-danger  { background: #fef2f2; border-color: #ef4444; color: #991b1b; }
      .smaxai-md-callout-note    { background: #f8fafc; border-color: #94a3b8; color: #475569; }
      .smaxai-md-callout-success { background: #ecfdf5; border-color: #10b981; color: #065f46; }

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

        /* Markdown in dark mode */
        .smaxai-md h1, .smaxai-md h2, .smaxai-md h3, .smaxai-md h4 { color: #f9fafb; }
        .smaxai-md-link { color: #818cf8; }
        .smaxai-inline-code { background: rgba(129, 140, 248, 0.15); color: #a5b4fc; }
        .smaxai-md-code-block { border-color: #374151; background: #1f2937; }
        .smaxai-md-code-lang { background: #1e1b4b; border-color: #374151; color: #6b7280; }
        .smaxai-md-pre { color: #e5e7eb; }
        .smaxai-md-blockquote { background: rgba(99, 102, 241, 0.08); border-color: #6366f1; }
        .smaxai-md-hr { border-color: #374151; }
        .smaxai-md-table th { background: #1f2937; border-color: #374151; color: #f9fafb; }
        .smaxai-md-table td { border-color: #374151; color: #d1d5db; }
        .smaxai-md-table tr:nth-child(even) td { background: #1f2937; }
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


    const form = this.container.querySelector('.smaxai-input-form') as HTMLFormElement
    form?.addEventListener('submit', (e) => { e.preventDefault(); this.sendMessage() })
    sendBtn?.addEventListener('click', () => this.sendMessage())

    // --- Image Viewer Events ---
    const messagesContainer = this.container.querySelector('.smaxai-messages') as HTMLDivElement
    const imageViewer = this.container.querySelector('.smaxai-image-viewer') as HTMLDivElement
    const imageViewerImg = this.container.querySelector('.smaxai-image-viewer-img') as HTMLImageElement
    const imageViewerClose = this.container.querySelector('.smaxai-image-viewer-close') as HTMLButtonElement

    if (messagesContainer && imageViewer && imageViewerImg) {
      messagesContainer.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        if (target.tagName.toLowerCase() === 'img' && target.classList.contains('smaxai-md-img')) {
          const img = target as HTMLImageElement
          imageViewerImg.src = img.src
          imageViewer.classList.add('open')
        }
      })

      const closeViewer = () => {
        imageViewer.classList.remove('open')
        setTimeout(() => { if (!imageViewer.classList.contains('open')) imageViewerImg.src = '' }, 300)
      }

      imageViewerClose?.addEventListener('click', closeViewer)
      imageViewer.addEventListener('click', (e) => {
        if (e.target === imageViewer) closeViewer()
      })
      
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && imageViewer.classList.contains('open')) {
          closeViewer()
        }
      })
    }
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

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        if (value) {
          const chunk = decoder.decode(value, { stream: true })
          assistantMessage.content += chunk
          this.renderMessages()
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>
          </div>
          <h3>Xin chào! Tôi có thể giúp gì cho bạn?</h3>
        </div>
      `
      return
    }

    messagesContainer.innerHTML = this.messages.map(msg => `
      <div class="smaxai-message ${msg.role}">
        <div class="smaxai-message-content ${msg.role === 'assistant' ? 'smaxai-md' : ''}">
          ${msg.isStreaming && !msg.content ? `
            <div class="smaxai-loading">
              <div class="smaxai-spinner"></div>
              <span>Đang suy nghĩ...</span>
            </div>
          ` : msg.role === 'assistant' ? parseMarkdown(msg.content) : escapeHtml(msg.content)}
        </div>

        <!-- Image Viewer HTML -->
        <div class="smaxai-image-viewer">
          <button class="smaxai-image-viewer-close" title="Đóng">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
          <img class="smaxai-image-viewer-img" src="" alt="Phóng to">
        </div>
      </div>
    `).join('')

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight
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