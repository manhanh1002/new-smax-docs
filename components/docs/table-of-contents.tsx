"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { type TOCItem } from "@/lib/docs/utils"
import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { List } from "lucide-react"

import { useLanguage } from "@/lib/context/language-context"
import { dictionaries } from "@/lib/i18n/dictionaries"

interface TableOfContentsProps {
  toc: TOCItem[]
}

export function MobileTableOfContents({ toc }: TableOfContentsProps) {
  const [open, setOpen] = useState(false)
  const { language } = useLanguage()
  const t = dictionaries[language] || dictionaries['vi'] || { toc: { title: "Mục lục" } }

  if (!toc.length) return null

  return (
    <div className="xl:hidden my-4">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="w-full flex items-center gap-2 justify-start text-muted-foreground">
            <List className="h-4 w-4" />
            <span>{t.toc?.title || "Mục lục"}</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[60vh] sm:h-[50vh]">
          <SheetHeader className="text-left">
            <SheetTitle>{t.toc?.title || "Mục lục"}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 h-full overflow-y-auto pb-8">
            <ul className="space-y-3 text-sm">
              {toc.map((item, index) => (
                <li key={index} className={cn(
                  item.depth === 2 && "pl-2",
                  item.depth === 3 && "pl-4",
                  item.depth === 4 && "pl-6"
                )}>
                  <Link
                    href={item.url}
                    className={cn(
                      "block text-muted-foreground hover:text-foreground transition-colors",
                      item.depth === 1 && "font-semibold"
                    )}
                    onClick={(e) => {
                      e.preventDefault()
                      setOpen(false)
                      document.querySelector(item.url)?.scrollIntoView({
                        behavior: "smooth",
                      })
                    }}
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export function TableOfContents({ toc }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("")
  const { language } = useLanguage()
  const t = dictionaries[language] || dictionaries['vi'] || { toc: { title: "Mục lục" } }

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: "0% 0% -80% 0%" }
    )

    const headers = document.querySelectorAll("h1, h2, h3, h4")
    headers.forEach((header) => observer.observe(header))

    return () => {
      headers.forEach((header) => observer.unobserve(header))
    }
  }, [])

  if (!toc.length) return null

  return (
    <div className="space-y-4">
      <p className="font-bold text-xs text-foreground uppercase tracking-wider opacity-80">{t.toc.title}</p>
      <ul className="m-0 list-none space-y-3 text-sm">
        {toc.map((item, index) => (
          <li key={index} className={cn(
            item.depth === 2 && "pl-2",
            item.depth === 3 && "pl-4",
            item.depth === 4 && "pl-6"
          )}>
            <Link
              href={item.url}
              className={cn(
                "block transition-colors hover:text-foreground",
                activeId === item.url.replace("#", "")
                  ? "font-medium text-primary"
                  : "text-muted-foreground",
                item.depth === 1 && "font-semibold"
              )}
              onClick={(e) => {
                e.preventDefault()
                document.querySelector(item.url)?.scrollIntoView({
                  behavior: "smooth",
                })
              }}
            >
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
