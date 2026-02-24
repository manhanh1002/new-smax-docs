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
    <div className="flex items-center gap-2 border-b border-border/50 bg-background px-4 py-2 md:hidden">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <nav className="flex items-center gap-1 text-sm text-muted-foreground overflow-x-auto">
        {section && (
          <>
            <span className="truncate">{section}</span>
            {page && <ChevronRight className="h-4 w-4 shrink-0" />}
          </>
        )}
        {page && <span className="text-foreground truncate">{page}</span>}
      </nav>
    </div>
  )
}
