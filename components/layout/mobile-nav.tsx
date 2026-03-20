"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useParams } from "next/navigation"
import { X, ChevronDown, ChevronRight, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { topNavigation, siteConfig } from "@/lib/docs/nav"
import { ThemeToggle } from "./theme-toggle"
import { useTheme } from "next-themes"
import { type NavItem } from "@/lib/docs/nav"
import { useDocsNavigation } from "@/hooks/use-docs-navigation"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

import { useLanguage } from "@/lib/context/language-context"
import { dictionaries } from "@/lib/i18n/dictionaries"

const languages = [
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "en", label: "English", flag: "🇺🇸" },
]

interface MobileNavProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const pathname = usePathname()
  const params = useParams()
  const { language, setLanguage } = useLanguage()
  const { resolvedTheme } = useTheme()
  const [langOpen, setLangOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Use lang from params if available, otherwise from context
  const lang = (params?.lang as "vi" | "en") || language
  
  // Fetch dynamic navigation
  const { navigation, isLoading } = useDocsNavigation(lang)

  useEffect(() => {
    setMounted(true)
  }, [])

  const t = dictionaries[lang] ?? dictionaries.vi
  const currentLang = languages.find((l) => l.code === lang) || languages[0]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full max-w-sm p-0 flex flex-col bg-background" hideCloseButton>
        <VisuallyHidden>
          <SheetTitle>Navigation Menu</SheetTitle>
        </VisuallyHidden>
        
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-card">
            <Link href="/" className="flex items-center gap-2" onClick={() => onOpenChange(false)}>
              {mounted ? (
                <div className="relative w-[120px] h-[33px]">
                  <Image 
                    src={resolvedTheme === 'dark' ? "/logo-dark.png" : "/logo.png"} 
                    alt="SmaxAI Logo" 
                    fill
                    className="object-contain object-left"
                    priority
                    sizes="120px"
                  />
                </div>
              ) : (
                <div className="w-[120px] h-[33px]" />
              )}
              <SheetTitle className="sr-only">{siteConfig.name}</SheetTitle>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => onOpenChange(false)}
              aria-label={t.nav.closeMenu}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation Content */}
          <nav className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="px-2 py-4 text-sm text-muted-foreground">Loading...</div>
            ) : (
              navigation.map((section) => (
                <div key={section.title} className="mb-6">
                  <div className="mb-2 flex items-center gap-2 px-2 py-1 text-sm font-bold text-foreground uppercase tracking-wider opacity-80">
                    {section.icon && <section.icon className="h-4 w-4" />}
                    {section.title}
                  </div>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <MobileSidebarItem 
                        key={item.href} 
                        item={item} 
                        lang={lang} 
                        onClose={() => onOpenChange(false)} 
                      />
                    ))}
                  </ul>
                </div>
              ))
            )}
          </nav>

          {/* Footer Actions */}
          <div className="border-t border-border p-4 bg-card">
            <div className="flex items-center justify-between gap-2">
              <div className="relative">
                <button
                  className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => setLangOpen(!langOpen)}
                >
                  <span className="text-base">{currentLang.flag}</span>
                  <span>{currentLang.label}</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", langOpen && "rotate-180")} />
                </button>
                {langOpen && (
                  <div className="absolute bottom-full left-0 mb-1 z-10 w-40 rounded-lg border border-border bg-popover shadow-lg">
                    {languages.map((l) => (
                      <button
                        key={l.code}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent first:rounded-t-lg last:rounded-b-lg",
                          l.code === lang && "bg-accent/50",
                        )}
                        onClick={() => {
                          setLanguage(l.code as "vi" | "en")
                          setLangOpen(false)
                        }}
                      >
                        <span className="text-base">{l.flag}</span>
                        <span>{l.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function MobileSidebarItem({ 
  item, 
  lang, 
  onClose,
  level = 0
}: { 
  item: NavItem; 
  lang: string;
  onClose: () => void;
  level?: number;
}) {
  const pathname = usePathname()
  
  // Dynamic href based on language
  let href = item.href
  if (item.href.includes('/vi') || item.href.includes('/en')) {
    href = item.href.replace(/\/(vi|en)/, `/${lang}`)
  }

  // Check active state
  const isActive = pathname === href

  const hasActiveChild = (items?: NavItem[]): boolean => {
    if (!items) return false
    return items.some(i => {
      const iHref = i.href.replace(/\/(vi|en)/, `/${lang}`)
      return iHref === pathname || hasActiveChild(i.items)
    })
  }
  
  const isChildActive = hasActiveChild(item.items)
  const isExpanded = isChildActive || (item.items && item.collapsible === false)
  const [isOpen, setIsOpen] = useState(isExpanded)

  useEffect(() => {
    if (isExpanded) setIsOpen(true)
  }, [isExpanded])

  if (item.items?.length) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <li className="relative">
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:text-primary hover:bg-accent/50",
                isActive || isChildActive ? "font-medium text-foreground" : "text-muted-foreground",
                level > 0 && "pl-4"
              )}
            >
              <span className="flex-1 text-left">{item.title}</span>
              <ChevronRight
                className={cn(
                  "h-4 w-4 text-muted-foreground/50 transition-transform duration-200",
                  isOpen && "rotate-90"
                )}
              />
            </button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="animate-in slide-in-from-top-2 fade-in duration-200">
            <ul className="mt-1 space-y-1 border-l border-border/40 ml-2.5 pl-2">
              {item.items.map((subItem) => (
                <MobileSidebarItem 
                  key={subItem.href} 
                  item={subItem} 
                  lang={lang} 
                  onClose={onClose}
                  level={level + 1}
                />
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
        onClick={onClose}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:text-primary hover:bg-accent/50",
          isActive 
            ? "font-medium text-primary bg-primary/10" 
            : "text-muted-foreground",
          level > 0 && "pl-4"
        )}
      >
        {item.title}
      </Link>
    </li>
  )
}
