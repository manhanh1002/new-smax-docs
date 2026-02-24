import Link from "next/link"
import { ChevronLeft, ChevronRight, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

import { useLanguage } from "@/lib/context/language-context"
import { dictionaries } from "@/lib/i18n/dictionaries"

interface DocsPagerProps {
  prev: { title: string; href: string } | null
  next: { title: string; href: string } | null
}

export function DocsPager({ prev, next }: DocsPagerProps) {
  const { language } = useLanguage()
  const t = dictionaries[language]

  if (!prev && !next) return null

  return (
    <div className="mt-12 pt-8 border-t border-border">
      {/* Section label */}
      <div className="flex items-center gap-2 mb-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <FileText className="h-3.5 w-3.5" />
        <span>{language === 'vi' ? 'Bài viết khác' : 'Other articles'}</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Previous */}
        <div className={cn(
          "group",
          !prev && "hidden sm:block"
        )}>
          {prev ? (
            <Link
              href={prev.href}
              className="flex flex-col h-full p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-muted/50 transition-all duration-200"
            >
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-primary transition-colors mb-2">
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>{t.pager.prev}</span>
              </div>
              <div className="font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                {prev.title}
              </div>
            </Link>
          ) : (
            <div className="h-full p-4 rounded-lg border border-dashed border-border/50 bg-muted/20 opacity-50">
              <div className="text-xs text-muted-foreground mb-2">{t.pager.prev}</div>
              <div className="text-sm text-muted-foreground italic">
                {language === 'vi' ? 'Không có bài trước' : 'No previous article'}
              </div>
            </div>
          )}
        </div>

        {/* Next */}
        <div className={cn(
          "group",
          !next && "hidden sm:block"
        )}>
          {next ? (
            <Link
              href={next.href}
              className="flex flex-col h-full p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 text-right"
            >
              <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground group-hover:text-primary transition-colors mb-2">
                <span>{t.pager.next}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
              <div className="font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                {next.title}
              </div>
            </Link>
          ) : (
            <div className="h-full p-4 rounded-lg border border-dashed border-border/50 bg-muted/20 opacity-50 text-right">
              <div className="text-xs text-muted-foreground mb-2">{t.pager.next}</div>
              <div className="text-sm text-muted-foreground italic">
                {language === 'vi' ? 'Không có bài tiếp' : 'No next article'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}