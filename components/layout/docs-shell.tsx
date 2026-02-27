"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Topbar } from "./topbar"
import { Sidebar } from "./sidebar"
import { MobileNav } from "./mobile-nav"
import { MobileBreadcrumbBar } from "./mobile-breadcrumb-bar"
import { Footer } from "./footer"
import { SkipLink } from "./skip-link"
import { CommandPalette } from "@/components/search/command-palette"
import { AssistantSheet } from "@/components/assistant/assistant-sheet"
import { navigation } from "@/lib/docs/nav"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

import { LanguageProvider } from "@/lib/context/language-context"

interface DocsShellProps {
  children: React.ReactNode
}

export function DocsShell({ children }: DocsShellProps) {
  return (
    <LanguageProvider>
      <DocsShellContent>{children}</DocsShellContent>
    </LanguageProvider>
  )
}

function DocsShellContent({ children }: DocsShellProps) {
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Check if we are in admin section
  const isAdmin = pathname?.startsWith('/tai-lieu/admin')

  // Find current section and page for breadcrumbs
  const currentNav = navigation.find((section) => section.items.some((item) => item.href === pathname))
  const currentPage = currentNav?.items.find((item) => item.href === pathname)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === "i" && (e.metaKey || e.ctrlKey) && !isAdmin) {
        e.preventDefault()
        setAssistantOpen(true)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [isAdmin])

  // If admin, render simpler shell or just children (since admin has its own layout)
  // But RootLayout wraps everything in DocsShell, so we need to conditionally render
  if (isAdmin) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <Topbar onSearchClick={() => setSearchOpen(true)} onAssistantClick={() => setAssistantOpen(true)} />
      <MobileBreadcrumbBar
        section={currentNav?.title}
        page={currentPage?.title}
        onMenuClick={() => setMobileNavOpen(true)}
      />
      <div className="flex flex-1">
        <div className="hidden lg:block">
          <div className="sticky top-16 h-[calc(100vh-4rem)]">
            <Sidebar onSearchClick={() => setSearchOpen(true)} onAssistantClick={() => setAssistantOpen(true)} />
          </div>
        </div>
        <main id="main-content" className="relative flex-1" tabIndex={-1}>
          {children}
        </main>
      </div>

      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <AssistantSheet open={assistantOpen} onOpenChange={setAssistantOpen} />
      
      {!assistantOpen && (
        <Button
          onClick={() => setAssistantOpen(true)}
          className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-50 animate-in fade-in zoom-in duration-300 hover:scale-110"
          size="icon"
          aria-label="Open AI Assistant"
        >
          <Sparkles className="h-6 w-6" />
        </Button>
      )}
    </div>
  )
}
