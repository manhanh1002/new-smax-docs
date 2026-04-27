"use client"

import React, { useState, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import { Copy, Check, Info, AlertTriangle, Lightbulb, AlertCircle, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { slugify } from "@/lib/docs/utils"

// ============================================================================
// TYPES & CONFIG
// ============================================================================

interface MarkdownRendererProps {
  content: string
  className?: string
}

const calloutConfig = {
  info: { icon: Info, bgClass: "bg-blue-50 dark:bg-blue-950/30", borderClass: "border-blue-400", iconClass: "text-blue-500" },
  warning: { icon: AlertTriangle, bgClass: "bg-yellow-50 dark:bg-yellow-950/30", borderClass: "border-yellow-400", iconClass: "text-yellow-500" },
  tip: { icon: Lightbulb, bgClass: "bg-green-50 dark:bg-green-950/30", borderClass: "border-green-400", iconClass: "text-green-500" },
  danger: { icon: AlertCircle, bgClass: "bg-red-50 dark:bg-red-950/30", borderClass: "border-red-400", iconClass: "text-red-500" },
  note: { icon: Info, bgClass: "bg-slate-50 dark:bg-slate-950/30", borderClass: "border-slate-400", iconClass: "text-slate-500" },
  success: { icon: CheckCircle, bgClass: "bg-emerald-50 dark:bg-emerald-950/30", borderClass: "border-emerald-400", iconClass: "text-emerald-500" },
}

// ============================================================================
// UTILS
// ============================================================================

function unescapeMarkdown(text: string) {
  if (!text) return ""
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\r(?!ightarrow)/g, "\r") // Don't mangle \rightarrow
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
}

function handleImageUrl(src: string) {
  if (!src) return ""
  
  // Handle Outline attachment URLs - use our proxy
  const attachmentMatch = src.match(/attachments\.redirect\?id=([a-zA-Z0-9-]+)/)
  if (attachmentMatch) {
    return `/api/outline/image?id=${attachmentMatch[1]}`
  } 
  
  if (src.startsWith("/") && !src.startsWith("//")) {
    const outlineUrl = process.env.NEXT_PUBLIC_OUTLINE_URL || "https://docs.cdp.vn"
    return `${outlineUrl}${src}`
  }
  
  return src
}

// ============================================================================
// COMPONENTS
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

function Callout({ type, title, content }: { type: string; title?: string; content: string }) {
  const config = calloutConfig[type as keyof typeof calloutConfig] || calloutConfig.note
  const Icon = config.icon

  return (
    <div className={cn("my-6 rounded-lg border-l-4 p-4", config.bgClass, config.borderClass)}>
      <div className="flex items-start gap-3">
        <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", config.iconClass)} />
        <div className="flex-1 min-w-0">
          {title && <div className="font-semibold text-foreground mb-2">{title}</div>}
          <div className="text-sm text-muted-foreground prose-sm prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN RENDERER
// ============================================================================

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // 1. Pre-process icons and unescape
  const processedContent = useMemo(() => {
    if (!content) return ""
    
    // Support Outline/AI icons - do this BEFORE unescape to avoid \r mangling
    let text = content
      // Handle LaTeX-style $ \rightarrow $ or similar
      .replace(/\$\s*\\rightarrow\s*\$/g, "→")
      .replace(/\$\s*\\leftarrow\s*\$/g, "←")
      // Handle raw commands
      .replace(/\\rightarrow/g, "→")
      .replace(/\\leftarrow/g, "←")
      .replace(/\\\rightarrow/g, "→") // Handle double escape
    
    text = unescapeMarkdown(text)
    
    // Convert :::callout[title]\ncontent\n::: to <div data-callout="...">...</div>
    // This allows ReactMarkdown to handle the blocks
    // We use a regex that matches across multiple lines
    const calloutRegex = /^:::(info|warning|tip|danger|note|success)(?:\s+\[([^\]]*)\])?\s*\n([\s\S]*?)\n:::/gm
    
    return text.replace(calloutRegex, (match, type, title, innerContent) => {
      // Use a marker that we can split later, or just keep it as is if we use a custom parser
      // For simplicity and robustness, let's split the content into segments
      return `\n\n<CALLOUT type="${type}" title="${title || ""}">${innerContent}</CALLOUT>\n\n`
    })
  }, [content])

  // 2. Split content by our custom CALLOUT tags to render them with our component
  const segments = useMemo(() => {
    const parts = processedContent.split(/(<CALLOUT.*?<\/CALLOUT>)/gs)
    return parts.map(part => {
      const calloutMatch = part.match(/<CALLOUT type="(.*?)" title="(.*?)">([\s\S]*)<\/CALLOUT>/)
      if (calloutMatch) {
        return {
          type: "callout",
          calloutType: calloutMatch[1],
          calloutTitle: calloutMatch[2],
          content: calloutMatch[3].trim()
        }
      }
      return { type: "markdown", content: part }
    })
  }, [processedContent])

  return (
    <div className={cn("markdown-content break-words", className)}>
      {segments.map((segment, index) => {
        if (segment.type === "callout") {
          return (
            <Callout 
              key={index} 
              type={segment.calloutType!} 
              title={segment.calloutTitle} 
              content={segment.content} 
            />
          )
        }

        if (!segment.content.trim()) return null

        return (
          <ReactMarkdown
            key={index}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              h1: ({ children }) => {
                const id = slugify(String(children))
                return (
                  <h1 id={id} className="mb-4 mt-8 text-3xl font-bold text-foreground scroll-m-20">
                    <a href={`#${id}`} className="no-underline hover:underline">{children}</a>
                  </h1>
                )
              },
              h2: ({ children }) => {
                const id = slugify(String(children))
                return (
                  <h2 id={id} className="mb-3 mt-6 text-2xl font-semibold text-foreground scroll-m-20">
                    <a href={`#${id}`} className="no-underline hover:underline">{children}</a>
                  </h2>
                )
              },
              h3: ({ children }) => {
                const id = slugify(String(children))
                return <h3 id={id} className="mb-2 mt-4 text-xl font-semibold text-foreground scroll-m-20">{children}</h3>
              },
              h4: ({ children }) => {
                const id = slugify(String(children))
                return <h4 id={id} className="mb-2 mt-4 text-lg font-semibold text-foreground scroll-m-20">{children}</h4>
              },
              p: ({ children }) => <p className="mb-4 text-muted-foreground leading-7 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="my-4 ml-6 list-disc space-y-2 text-muted-foreground">{children}</ul>,
              ol: ({ children }) => <ol className="my-4 ml-6 list-decimal space-y-2 text-muted-foreground">{children}</ol>,
              li: ({ children }) => <li className="pl-1">{children}</li>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary/50 pl-4 my-4 italic text-muted-foreground bg-muted/30 py-2 rounded-r">
                  {children}
                </blockquote>
              ),
              code: ({ node, inline, className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || "")
                if (!inline && match) {
                  return (
                    <CodeBlock
                      language={match[1]}
                      code={String(children).replace(/\n$/, "")}
                    />
                  )
                }
                if (!inline && !match && String(children).includes("\n")) {
                    return (
                      <CodeBlock
                        code={String(children).replace(/\n$/, "")}
                      />
                    )
                }
                return (
                  <code className="rounded px-1.5 py-0.5 font-mono text-sm bg-muted text-foreground" {...props}>
                    {children}
                  </code>
                )
              },
              table: ({ children }) => (
                <div className="my-6 w-full overflow-x-auto">
                  <table className="w-full border-collapse text-sm">{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead className="border-b border-border bg-muted/50">{children}</thead>,
              th: ({ children }) => <th className="px-4 py-3 text-left font-semibold text-foreground">{children}</th>,
              td: ({ children }) => <td className="px-4 py-3 text-muted-foreground border-b border-border">{children}</td>,
              img: ({ src, alt }) => (
                <span className="block my-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={handleImageUrl(src || "")}
                    alt={alt || ""}
                    className="rounded-lg border mx-auto max-w-full"
                    style={{ maxWidth: "100%", maxHeight: "37.5rem", height: "auto", display: "block", objectFit: "contain" }}
                    loading="lazy"
                  />
                  {alt && <span className="block text-center text-sm text-muted-foreground mt-2">{alt}</span>}
                </span>
              ),
              a: ({ href, children }) => {
                const isExternal = href?.startsWith("http")
                return (
                  <a
                    href={href}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    className="text-primary underline underline-offset-4 hover:text-primary/80 break-all"
                  >
                    {children}
                  </a>
                )
              },
              hr: () => <hr className="my-8 border-border" />,
            }}
          >
            {segment.content}
          </ReactMarkdown>
        )
      })}
    </div>
  )
}