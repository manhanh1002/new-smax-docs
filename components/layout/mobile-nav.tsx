"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { X, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { navigation, siteConfig, topNavigation } from "@/lib/docs/nav"
import { ThemeToggle } from "./theme-toggle"

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
  const { language, setLanguage } = useLanguage()
  const [langOpen, setLangOpen] = useState(false)
  const [sectionOpen, setSectionOpen] = useState(false)

  const t = dictionaries[language]
  const currentLang = languages.find((l) => l.code === language) || languages[0]
  const currentSection = topNavigation.find((item) => pathname.startsWith(item.href)) || topNavigation[0]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full max-w-sm p-0" hideCloseButton>
        <div className="flex flex-col h-full">
          {/* Header with logo, theme toggle, close button */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Link href="/" className="flex items-center gap-2" onClick={() => onOpenChange(false)}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5 text-primary-foreground"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <SheetTitle className="font-semibold text-foreground text-base">{siteConfig.name}</SheetTitle>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
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
          </div>

          {/* Dropdowns */}
          <div className="px-4 py-3 space-y-2 border-b border-border">
            {/* Language dropdown */}
            <div className="relative">
              <button
                className="flex w-full items-center justify-between rounded-lg border border-border bg-secondary/50 px-4 py-3 text-sm"
                onClick={() => setLangOpen(!langOpen)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{currentLang.flag}</span>
                  <span>{currentLang.label}</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", langOpen && "rotate-180")} />
              </button>
              {langOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-10 rounded-lg border border-border bg-background shadow-lg">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      className={cn(
                        "flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary transition-colors",
                        lang.code === language && "text-accent",
                      )}
                      onClick={() => {
                        setLanguage(lang.code as "vi" | "en")
                        setLangOpen(false)
                      }}
                    >
                      <span className="text-base">{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Section dropdown */}
            <div className="relative">
              <button
                className="flex w-full items-center justify-between rounded-lg border border-border bg-secondary/50 px-4 py-3 text-sm"
                onClick={() => setSectionOpen(!sectionOpen)}
              >
                <span>{currentSection?.title || "Documentation"}</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", sectionOpen && "rotate-180")} />
              </button>
              {sectionOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-10 rounded-lg border border-border bg-background shadow-lg">
                  {topNavigation.map((item) => {
                    const href = item.href.replace("/tai-lieu", `/tai-lieu/${language}`)
                    return (
                      <Link
                        key={item.href}
                        href={href}
                        className={cn(
                          "flex w-full items-center px-4 py-2.5 text-sm hover:bg-secondary transition-colors",
                          pathname.startsWith(href) && "text-accent",
                        )}
                        onClick={() => {
                          setSectionOpen(false)
                          onOpenChange(false)
                        }}
                      >
                        {item.title}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Navigation sections */}
          <nav className="overflow-y-auto flex-1 px-4 py-3">
            {navigation.map((section) => (
              <div key={section.title} className="mb-4">
                <div className="mb-2 flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-foreground">
                  {section.icon && <section.icon className="h-4 w-4" />}
                  {section.title}
                </div>
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => onOpenChange(false)}
                          className={cn(
                            "flex items-center rounded-lg px-3 py-2 text-sm transition-colors",
                            isActive
                              ? "bg-accent/20 text-accent font-medium"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                          )}
                        >
                          {item.title}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  )
}
