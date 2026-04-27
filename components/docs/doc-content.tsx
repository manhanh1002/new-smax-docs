"use client"

import React from "react"
import { Copy, Check, Clock, Calendar } from "lucide-react"
import { Breadcrumbs } from "./breadcrumbs"
import { Button } from "@/components/ui/button"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { TableOfContents, MobileTableOfContents } from "@/components/docs/table-of-contents"
import { DocsPager } from "@/components/docs/pager"
import { DocsRating } from "@/components/docs/docs-rating"
import { DocsShare } from "@/components/docs/docs-share"
import { MarkdownRenderer } from "@/components/docs/markdown-renderer"
import { extractTOC, calculateReadingTime } from "@/lib/docs/utils"
import { useEffect } from "react"
import { trackAnalyticsEvent } from "@/lib/actions/admin"

import { useLanguage } from "@/lib/context/language-context"
import { dictionaries } from "@/lib/i18n/dictionaries"

interface DocContentProps {
  title: string
  content: string
  slug?: string
  lastUpdated?: string | null
  pager?: {
    prev: { title: string; href: string } | null
    next: { title: string; href: string } | null
  }
  breadcrumbs?: { title: string; href: string }[]
}

export function DocContent({ title, content, slug, lastUpdated, pager, breadcrumbs }: DocContentProps) {
  const { copied, copy } = useCopyToClipboard()
  const { language } = useLanguage()
  
  // Safe access to dictionary
  const t = dictionaries[language] || dictionaries['vi'] || {
    content: { copied: "Đã sao chép", copyPage: "Sao chép trang" },
    toc: { title: "Mục lục" }
  }
  
  // Calculate reading time
  const readingTime = calculateReadingTime(content || '')
  
  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }
  
  // Extract TOC
  const toc = extractTOC(content || '')

  // Track view event
  useEffect(() => {
    // Only track if slug exists (not preview or error page)
    if (slug) {
      // Use a small delay to avoid tracking instant bounces or rapid navigation
      const timer = setTimeout(() => {
        trackAnalyticsEvent('view_doc', { title, slug, language })
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [slug, title, language])

  // Handle scroll to hash on initial load
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.substring(1)
      const timer = setTimeout(() => {
        const element = document.getElementById(hash)
        if (element) {
          element.scrollIntoView({ behavior: "smooth" })
        }
      }, 500) // Small delay for content to render
      return () => clearTimeout(timer)
    }
  }, [])

  const copyPage = () => {
    const fullContent = `# ${title}\n\n${content}`
    copy(fullContent)
  }

  const breadcrumbItems = [
    ...(breadcrumbs?.map(b => ({ label: b.title, href: b.href })) || []),
    ...(slug ? [{ label: title }] : [])
  ]

  return (
    <div className="flex flex-col xl:flex-row min-h-full">
      <div className="flex-1 px-4 sm:px-8 py-8 sm:py-16">
        <div className="min-w-0 mx-auto max-w-4xl">
          {breadcrumbItems.length > 0 && <Breadcrumbs items={breadcrumbItems} className="mb-4 sm:mb-6" />}
          <header className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">{title}</h1>
              <Button variant="outline" size="sm" onClick={copyPage} className="shrink-0 gap-2 bg-transparent self-start">
                {copied ? (
                  <>
                    <Check className="size-4" />
                    <span className="hidden sm:inline">{t.content.copied}</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    <span className="hidden sm:inline">{t.content.copyPage}</span>
                  </>
                )}
              </Button>
            </div>
            
            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
              {readingTime > 0 && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{readingTime} {language === 'vi' ? 'phút đọc' : 'min read'}</span>
                </div>
              )}
              {lastUpdated && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{language === 'vi' ? 'Cập nhật' : 'Updated'}: {formatDate(lastUpdated)}</span>
                </div>
              )}
            </div>
          </header>
          <MobileTableOfContents toc={toc} />
          <MarkdownRenderer content={content} />
          
          <div className="mt-8 grid gap-8 border-t pt-8 lg:grid-cols-2">
            <DocsRating slug={slug} />
            <DocsShare title={title} slug={slug} className="lg:justify-self-end lg:flex lg:flex-col lg:items-end lg:text-right" />
          </div>

          {/* Bottom Navigation - Prev/Next */}
          {pager && <DocsPager prev={pager.prev} next={pager.next} />}
        </div>
      </div>

      <div className="hidden xl:block w-64 shrink-0 border-l border-border bg-card">
        <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto px-6 py-10">
          <TableOfContents toc={toc} />
        </div>
      </div>
    </div>
  )
}