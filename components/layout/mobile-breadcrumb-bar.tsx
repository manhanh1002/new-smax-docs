"use client"

import { Menu, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MobileBreadcrumbBarProps {
  section?: string
  page?: string
  onMenuClick: () => void
}

export function MobileBreadcrumbBar({ section, page, onMenuClick }: MobileBreadcrumbBarProps) {
  return (
    <div className="flex items-center gap-2 border-b border-border/50 bg-background px-4 py-2 lg:hidden sticky top-16 z-40">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <nav className="flex items-center gap-1 text-sm text-muted-foreground overflow-x-auto no-scrollbar">
        {section && (
          <>
            <span className="whitespace-nowrap">{section}</span>
            {page && <ChevronRight className="h-4 w-4 shrink-0" />}
          </>
        )}
        {page && <span className="text-foreground whitespace-nowrap">{page}</span>}
      </nav>
    </div>
  )
}
