"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Search, MoreVertical, Bell, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { siteConfig, topNavigation } from "@/lib/docs/nav"

import { useLanguage } from "@/lib/context/language-context"

interface TopbarProps {
  onSearchClick?: () => void
  onAssistantClick?: () => void
}

export function Topbar({ onSearchClick, onAssistantClick }: TopbarProps) {
  const pathname = usePathname()
  const { language } = useLanguage()

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center border-b border-border bg-card">
      {/* Logo on left - Fixed width matching sidebar */}
      <div className="flex h-full w-full lg:w-64 shrink-0 items-center border-r-0 lg:border-r border-border px-4 lg:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image 
            src="/logo.png" 
            alt="SmaxAI Logo" 
            width={877} 
            height={193}
          />
          
        </Link>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 items-center justify-between px-4 lg:px-6">
        {/* Center Search Bar */}
        <div className="flex-1 max-w-2xl hidden md:block mr-4">
          <Button
            variant="outline"
            className="relative w-full justify-start gap-2 text-muted-foreground bg-input hover:bg-input/80 border-transparent focus:border-primary rounded-lg h-10 px-4"
            onClick={onSearchClick}
          >
            <Search className="h-4 w-4" />
            <span className="inline-flex text-sm">Tìm kiếm tài liệu...</span>
            <div className="pointer-events-none absolute right-2 top-2 hidden h-6 select-none items-center gap-1 rounded bg-background px-2 font-mono text-[10px] font-medium opacity-100 sm:flex shadow-sm border border-border">
              <span className="text-xs">⌘</span>K
            </div>
          </Button>
        </div>

        {/* Desktop navigation & Actions */}
        <div className="hidden md:flex items-center gap-6 ml-auto">
          <nav className="flex items-center gap-6" aria-label="Main navigation">
            {topNavigation.map((item) => {
              const href = item.href.replace("/tai-lieu", `/tai-lieu/${language}`)
              return (
                <Link
                  key={item.href}
                  href={href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    pathname.startsWith(href) ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {item.title}
                </Link>
              )
            })}
          </nav>
          
          <div className="flex items-center gap-3 pl-2 border-l border-border/50">
            <Button 
              variant="outline" 
              size="sm" 
              className="hidden lg:flex text-primary border-primary bg-primary/10 hover:bg-primary/20 hover:text-primary hover:border-primary font-medium"
            >
              Đăng nhập
            </Button>
            
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
            </Button>
            
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full overflow-hidden border border-border/50 p-0">
              <div className="h-full w-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium text-xs">
                M
              </div>
            </Button>
          </div>
        </div>

        {/* Mobile icons */}
        <div className="flex items-center gap-2 md:hidden ml-auto">
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Search" onClick={onSearchClick}>
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="More options">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
