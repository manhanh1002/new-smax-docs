"use client"

import React, { useState, useMemo } from "react"
import { Copy, Check, Info, AlertTriangle, Lightbulb, AlertCircle, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// ============================================================================
// TYPES
// ============================================================================

type TokenType = 
  | 'heading1' | 'heading2' | 'heading3' | 'heading4'
  | 'paragraph'
  | 'code-block'
  | 'inline-code'
  | 'image'
  | 'link'
  | 'bold'
  | 'italic'
  | 'callout'
  | 'blockquote'
  | 'ul-item' | 'ol-item'
  | 'hr'
  | 'table'
  | 'text'

interface Token {
  type: TokenType
  content?: string
  language?: string
  alt?: string
  href?: string
  level?: number
  calloutType?: 'info' | 'warning' | 'tip' | 'danger' | 'note' | 'success'
  calloutTitle?: string
  children?: Token[]
  ordered?: boolean
  index?: number
  tableData?: string[][]
}

// ============================================================================
// CALLOUT CONFIG
// ============================================================================

const calloutConfig = {
  info: { icon: Info, bgClass: "bg-blue-50 dark:bg-blue-950/30", borderClass: "border-blue-400", iconClass: "text-blue-500" },
  warning: { icon: AlertTriangle, bgClass: "bg-yellow-50 dark:bg-yellow-950/30", borderClass: "border-yellow-400", iconClass: "text-yellow-500" },
  tip: { icon: Lightbulb, bgClass: "bg-green-50 dark:bg-green-950/30", borderClass: "border-green-400", iconClass: "text-green-500" },
  danger: { icon: AlertCircle, bgClass: "bg-red-50 dark:bg-red-950/30", borderClass: "border-red-400", iconClass: "text-red-500" },
  note: { icon: Info, bgClass: "bg-slate-50 dark:bg-slate-950/30", borderClass: "border-slate-400", iconClass: "text-slate-500" },
  success: { icon: CheckCircle, bgClass: "bg-emerald-50 dark:bg-emerald-950/30", borderClass: "border-emerald-400", iconClass: "text-emerald-500" },
}

// ============================================================================
// PARSER
// ============================================================================

function parseMarkdown(content: string): Token[] {
  const tokens: Token[] = []
  if (!content) return tokens
  
  const lines = content.split('\n')
  let i = 0
  
  // Safety counter to prevent infinite loops
  let loopCount = 0
  const MAX_LOOPS = lines.length * 10 // Generous limit

  while (i < lines.length) {
    loopCount++
    if (loopCount > MAX_LOOPS) {
        console.error("Markdown parser detected infinite loop, aborting.")
        break
    }
    
    const line = lines[i]

    // Empty line
    if (line.trim() === '') {
      i++
      continue
    }

    // Callout: :::type or :::type[title]
    if (line.startsWith(':::')) {
      const match = line.match(/^:::(info|warning|tip|danger|note|success)(?:\s+\[([^\]]*)\])?\s*$/)
      if (match) {
        const calloutType = match[1] as Token['calloutType']
        const calloutTitle = match[2]
        const calloutLines: string[] = []
        i++
        
        while (i < lines.length && !lines[i].startsWith(':::')) {
          calloutLines.push(lines[i])
          i++
        }
        
        tokens.push({
          type: 'callout',
          calloutType,
          calloutTitle,
          content: calloutLines.join('\n'),
        })
        i++ // Skip closing :::
        continue
      }
    }

    // Heading
    if (line.startsWith('#')) {
      const match = line.match(/^(#{1,4})\s+(.+)$/)
      if (match) {
        const level = match[1].length
        tokens.push({
          type: `heading${level}` as TokenType,
          content: match[2].trim(),
          level,
        })
        i++
        continue
      }
    }

    // Code block
    if (line.startsWith('```')) {
      const language = line.slice(3).trim() || undefined
      const codeLines: string[] = []
      i++
      
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      
      tokens.push({
        type: 'code-block',
        language,
        content: codeLines.join('\n'),
      })
      i++ // Skip closing ```
      continue
    }

    // HR
    if (line.match(/^-{3,}$/) || line.match(/^\*{3,}$/)) {
      tokens.push({ type: 'hr' })
      i++
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2))
        i++
      }
      tokens.push({
        type: 'blockquote',
        content: quoteLines.join('\n'),
      })
      continue
    }

    // Unordered list
    if (line.match(/^[-*+]\s+/)) {
      const listItems: string[] = []
      while (i < lines.length && lines[i].match(/^[-*+]\s+/)) {
        listItems.push(lines[i].replace(/^[-*+]\s+/, ''))
        i++
      }
      tokens.push({
        type: 'ul-item',
        children: listItems.map(item => ({ type: 'paragraph' as TokenType, content: item })),
      })
      continue
    }

    // Ordered list
    if (line.match(/^\d+\.\s+/)) {
      const listItems: string[] = []
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        listItems.push(lines[i].replace(/^\d+\.\s+/, ''))
        i++
      }
      tokens.push({
        type: 'ol-item',
        children: listItems.map(item => ({ type: 'paragraph' as TokenType, content: item })),
      })
      continue
    }

    // Table
    if (line.includes('|') && i + 1 < lines.length && lines[i + 1].match(/^\|?[\s-:|]+\|?$/)) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i])
        i++
      }
      
      const tableData = tableLines
        .filter(l => !l.match(/^\|?[\s-:|]+\|?$/))
        .map(row => row.split('|').map(cell => cell.trim()).filter(Boolean))
      
      tokens.push({
        type: 'table',
        tableData,
      })
      continue
    }

    // Image
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (imgMatch) {
      tokens.push({
        type: 'image',
        alt: imgMatch[1],
        href: imgMatch[2],
      })
      i++
      continue
    }

    // Default: paragraph
    tokens.push({
      type: 'paragraph',
      content: line,
    })
    i++
  }

  return tokens
}

// ============================================================================
// INLINE RENDERER
// ============================================================================

function renderInline(text: string): React.ReactNode {
  // Process inline elements: bold, italic, code, links, images
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Bold **text**
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/)
    if (boldMatch) {
      const before = remaining.slice(0, boldMatch.index!)
      if (before) parts.push(<span key={key++}>{before}</span>)
      parts.push(<strong key={key++} className="font-semibold text-foreground">{boldMatch[1]}</strong>)
      remaining = remaining.slice(boldMatch.index! + boldMatch[0].length)
      continue
    }

    // Italic *text*
    const italicMatch = remaining.match(/\*([^*]+)\*/)
    if (italicMatch) {
      const before = remaining.slice(0, italicMatch.index!)
      if (before) parts.push(<span key={key++}>{before}</span>)
      parts.push(<em key={key++} className="italic">{italicMatch[1]}</em>)
      remaining = remaining.slice(italicMatch.index! + italicMatch[0].length)
      continue
    }

    // Inline code `code`
    const codeMatch = remaining.match(/`([^`]+)`/)
    if (codeMatch) {
      const before = remaining.slice(0, codeMatch.index!)
      if (before) parts.push(<span key={key++}>{before}</span>)
      parts.push(
        <code key={key++} className="rounded px-1.5 py-0.5 font-mono text-sm bg-muted text-foreground">
          {codeMatch[1]}
        </code>
      )
      remaining = remaining.slice(codeMatch.index! + codeMatch[0].length)
      continue
    }

    // Link [text](url)
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch) {
      const before = remaining.slice(0, linkMatch.index!)
      if (before) parts.push(<span key={key++}>{before}</span>)
      const isExternal = linkMatch[2].startsWith('http')
      parts.push(
        <a 
          key={key++} 
          href={linkMatch[2]} 
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="text-primary underline underline-offset-4 hover:text-primary/80 break-all"
        >
          {linkMatch[1]}
        </a>
      )
      remaining = remaining.slice(linkMatch.index! + linkMatch[0].length)
      continue
    }

    // Image ![alt](url) - inline
    const imgMatch = remaining.match(/!\[([^\]]*)\]\(([^)]+)\)/)
    if (imgMatch) {
      const before = remaining.slice(0, imgMatch.index!)
      if (before) parts.push(<span key={key++}>{before}</span>)
      parts.push(renderImage(imgMatch[2], imgMatch[1], key++))
      remaining = remaining.slice(imgMatch.index! + imgMatch[0].length)
      continue
    }

    // No more matches, add remaining text
    parts.push(<span key={key++}>{remaining}</span>)
    break
  }

  return parts.length > 0 ? parts : text
}

// ============================================================================
// IMAGE RENDERER
// ============================================================================

function renderImage(src: string, alt: string, key: number): React.ReactNode {
  let imageSrc = src
  
  // Handle Outline attachment URLs - use our proxy
  // Use a more permissive regex to catch all alphanumeric IDs (base58/base62/uuid)
  const attachmentMatch = src.match(/attachments\.redirect\?id=([a-zA-Z0-9-]+)/)
  if (attachmentMatch) {
    imageSrc = `/api/outline/image?id=${attachmentMatch[1]}`
  } else if (src.startsWith("/") && !src.startsWith("//")) {
    // If it's a relative URL, it might be an internal Outline image (not attachment)
    // Or it might be a local image in our public folder (unlikely for Outline docs)
    // Try to proxy it or use the configured Outline URL
    const outlineUrl = process.env.NEXT_PUBLIC_OUTLINE_URL || "https://docs.cdp.vn"
    imageSrc = `${outlineUrl}${src}`
  }

  return (
    <span key={key} className="block my-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt={alt || ""}
        className="rounded-lg border mx-auto max-w-full"
        style={{ maxWidth: '100%', maxHeight: '37.5rem', height: 'auto', display: 'block', objectFit: 'contain' }}
        loading="lazy"
      />
      {alt && <span className="block text-center text-sm text-muted-foreground mt-2">{alt}</span>}
    </span>
  )
}

// ============================================================================
// CODE BLOCK COMPONENT
// ============================================================================

function CodeBlock({ language, code }: { language?: string; code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group my-4">
      <div className="absolute right-2 top-2 z-10">
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-2 bg-muted/80 hover:bg-muted">
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      {language && <div className="absolute left-3 top-2 text-xs text-muted-foreground font-mono">{language}</div>}
      <pre className={cn("overflow-x-auto rounded-lg border bg-muted/30 p-4 pt-8 text-sm font-mono", language && "pt-10")}>
        <code className="text-foreground">{code}</code>
      </pre>
    </div>
  )
}

// ============================================================================
// CALLOUT COMPONENT
// ============================================================================

function Callout({ type, title, content }: { type: Token['calloutType']; title?: string; content: string }) {
  const config = calloutConfig[type || 'note']
  const Icon = config.icon

  return (
    <div className={cn("my-4 rounded-lg border-l-4 p-4", config.bgClass, config.borderClass)}>
      <div className="flex items-start gap-3">
        <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", config.iconClass)} />
        <div className="flex-1 min-w-0">
          {title && <div className="font-semibold text-foreground mb-2">{title}</div>}
          <div className="text-sm text-muted-foreground">
            <MarkdownRenderer content={content} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN RENDERER
// ============================================================================

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const tokens = useMemo(() => parseMarkdown(content), [content])

  const renderToken = (token: Token, index: number): React.ReactNode => {
    switch (token.type) {
      case 'heading1':
        const id1 = (token.content || '').toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
        return (
          <h1 key={index} id={id1} className="mb-4 mt-8 text-3xl font-bold text-foreground scroll-m-20">
            <a href={`#${id1}`} className="no-underline hover:underline">{renderInline(token.content || '')}</a>
          </h1>
        )
      
      case 'heading2':
        const id2 = (token.content || '').toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
        return (
          <h2 key={index} id={id2} className="mb-3 mt-6 text-2xl font-semibold text-foreground scroll-m-20">
            <a href={`#${id2}`} className="no-underline hover:underline">{renderInline(token.content || '')}</a>
          </h2>
        )
      
      case 'heading3':
        const id3 = (token.content || '').toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
        return <h3 key={index} id={id3} className="mb-2 mt-4 text-xl font-semibold text-foreground scroll-m-20">{renderInline(token.content || '')}</h3>
      
      case 'heading4':
        return <h4 key={index} className="mb-2 mt-4 text-lg font-semibold text-foreground">{renderInline(token.content || '')}</h4>
      
      case 'paragraph':
        return <p key={index} className="mb-4 text-muted-foreground leading-7 break-words">{renderInline(token.content || '')}</p>
      
      case 'code-block':
        return <CodeBlock key={index} language={token.language} code={token.content || ''} />
      
      case 'image':
        return renderImage(token.href || '', token.alt || '', index)
      
      case 'callout':
        return <Callout key={index} type={token.calloutType} title={token.calloutTitle} content={token.content || ''} />
      
      case 'blockquote':
        return (
          <blockquote key={index} className="border-l-4 border-primary/50 pl-4 my-4 italic text-muted-foreground bg-muted/30 py-2 rounded-r">
            {renderInline(token.content || '')}
          </blockquote>
        )
      
      case 'ul-item':
        return (
          <ul key={index} className="my-4 ml-6 list-disc space-y-2 text-muted-foreground">
            {token.children?.map((child, i) => (
              <li key={i}>{renderInline(child.content || '')}</li>
            ))}
          </ul>
        )
      
      case 'ol-item':
        return (
          <ol key={index} className="my-4 ml-6 list-decimal space-y-2 text-muted-foreground">
            {token.children?.map((child, i) => (
              <li key={i}>{renderInline(child.content || '')}</li>
            ))}
          </ol>
        )
      
      case 'hr':
        return <hr key={index} className="my-8 border-border" />
      
      case 'table':
        if (!token.tableData || token.tableData.length === 0) return null
        const [header, ...rows] = token.tableData
        return (
          <div key={index} className="my-6 w-full overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              {header && (
                <thead className="border-b border-border bg-muted/50">
                  <tr>{header.map((cell, i) => <th key={i} className="px-4 py-3 text-left font-semibold text-foreground">{cell}</th>)}</tr>
                </thead>
              )}
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>{row.map((cell, j) => <td key={j} className="px-4 py-3 text-muted-foreground border-b border-border">{cell}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className={cn("markdown-content break-words overflow-hidden", className)}>
      {tokens.map((token, index) => renderToken(token, index))}
    </div>
  )
}