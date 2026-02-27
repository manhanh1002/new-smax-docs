"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search, Sparkles, ChevronRight, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { type NavItem } from "@/lib/docs/nav"
import { useDocsNavigation } from "@/hooks/use-docs-navigation"
import { LanguageSelector } from "./language-selector"
import { ThemeToggle } from "./theme-toggle"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import React from "react"

import { useLanguage } from "@/lib/context/language-context"
import { dictionaries } from "@/lib/i18n/dictionaries"
import { useParams } from "next/navigation"

interface SidebarProps {
  onSearchClick?: () => void
  onAssistantClick?: () => void
}

export function Sidebar({ onSearchClick, onAssistantClick }: SidebarProps) {
  const { language } = useLanguage()
  const params = useParams()
  const lang = (params?.lang as "vi" | "en") || language
  const t = dictionaries[lang]
  
  // Fetch navigation from database
  const { navigation, isLoading } = useDocsNavigation(lang)

  return (
    <aside
      role="navigation"
      aria-label={t.nav.mainNav}
      className="flex h-full w-64 flex-col border-r border-border bg-card pt-6"
    >
      <nav className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4" tabIndex={0}>
        {isLoading ? (
          <div className="px-2 py-4 text-sm text-muted-foreground">Loading...</div>
        ) : (
          navigation.map((section) => (
            <div key={section.title} className="mb-6">
              <div className="mb-2 flex items-center gap-2 px-2 py-1 text-sm font-bold text-foreground uppercase tracking-wider opacity-80">
                {section.icon && <section.icon className="h-4 w-4" aria-hidden="true" />}
                {section.title}
              </div>
              <ul className="space-y-1" role="list">
                {section.items.map((item) => (
                  <SidebarItem key={item.href} item={item} lang={lang} />
                ))}
              </ul>
            </div>
          ))
        )}
      </nav>

      <div className="border-t border-border/40 p-4">
        <div className="flex items-center justify-between gap-2">
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}

function SidebarItem({ item, level = 0, lang }: { item: NavItem; level?: number; lang: string }) {
  const pathname = usePathname()
  
  // Dynamic href based on language - avoid double lang prefix
  let href = item.href
  if (item.href.includes('/tai-lieu/')) {
    // Already has language prefix, replace it
    href = item.href.replace(/\/tai-lieu\/(vi|en)/, `/tai-lieu/${lang}`)
  } else {
    // No language prefix, add it
    href = item.href.replace("/tai-lieu", `/tai-lieu/${lang}`)
  }

  // Check if current item is active
  const isActive = pathname === href
  
  // Logic đệ quy kiểm tra active sâu hơn nếu cần
  const hasActiveChild = (items?: NavItem[]): boolean => {
    if (!items) return false
    return items.some(i => {
      const iHref = i.href.replace("/tai-lieu", `/tai-lieu/${lang}`)
      return iHref === pathname || hasActiveChild(i.items)
    })
  }
  
  const isChildActive = hasActiveChild(item.items)
  const isExpanded = isChildActive || (item.items && item.collapsible === false)

  const [isOpen, setIsOpen] = React.useState(isExpanded)

  // Auto-expand if child became active (e.g. navigation change)
  React.useEffect(() => {
    if (isExpanded) {
      setIsOpen(true)
    }
  }, [isExpanded])

  const Icon = item.icon

  if (item.items && item.items.length > 0) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <li className="relative">
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:text-primary",
                isActive || isChildActive ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              <span className="flex-1 text-left">{item.title}</span>
              {isOpen ? (
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 opacity-50" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-1 space-y-1 border-l border-border/40 ml-2.5 pl-2">
              {item.items.map((subItem) => (
                <SidebarItem key={subItem.href} item={subItem} level={level + 1} lang={lang} />
              ))}
            </ul>
          </CollapsibleContent>
        </li>
      </Collapsible>
    )
  }

  return (
    <li>
      <Link
        href={href}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex min-h-[32px] items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors border-l-2 border-transparent",
          isActive
            ? "border-primary bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary",
          level > 0 && "ml-0 border-l-0" // Remove left border for nested items to avoid double borders
        )}
      >
        {Icon && <Icon className="h-4 w-4" />}
        {item.title}
      </Link>
    </li>
  )
}
