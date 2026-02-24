"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Hash, ArrowLeft, Search } from "lucide-react"
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useDebounce } from "@/hooks/use-debounce"
import { Button } from "@/components/ui/button"

import { useLanguage } from "@/lib/context/language-context"
import { dictionaries } from "@/lib/i18n/dictionaries"

interface SearchResult {
  id: string
  title: string
  slug: string
  description: string
  href: string
  lastUpdated?: string | null
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const [isMobile, setIsMobile] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { language } = useLanguage()
  const t = dictionaries[language]

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Search function using Outline API
  const performSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      console.log('[Search] Searching for:', query)
      const response = await fetch('/api/docs/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          lang: language,
        }),
      })

      const data = await response.json()
      console.log('[Search] Response:', data)
      
      if (data.success && data.results) {
        console.log('[Search] Results count:', data.results.length)
        setResults(data.results)
      } else {
        console.log('[Search] No results or error')
        setResults([])
      }
    } catch (error) {
      console.error('[Search] Failed:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [language])

  // Trigger search when debounced query changes
  useEffect(() => {
    if (open && debouncedSearch) {
      performSearch(debouncedSearch)
    } else {
      setResults([])
    }
  }, [open, debouncedSearch, performSearch])

  const handleSelect = (href: string) => {
    onOpenChange(false)
    setSearch("")
    setResults([])
    router.push(href)
  }

  // Determine what to show
  const showSearchResults = search.length >= 2
  const showEmpty = showSearchResults && !isLoading && results.length === 0
  const showQuickLinks = !search

  // Debug render state
  console.log('[Search Render]', { 
    search, 
    searchLength: search.length, 
    showSearchResults, 
    isLoading, 
    resultsCount: results.length,
    showEmpty,
    showQuickLinks
  })

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} showCloseButton={false} shouldFilter={false}>
      <div className="flex items-center gap-2 border-b border-border p-2 sm:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          aria-label={t.search.close}
          className="shrink-0"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <CommandInput
          placeholder={t.search.placeholder}
          value={search}
          onValueChange={setSearch}
          aria-label={t.search.placeholder}
          className="border-0 focus:ring-0"
        />
      </div>
      <div className="hidden sm:block">
        <CommandInput
          placeholder={t.search.placeholder}
          value={search}
          onValueChange={setSearch}
          aria-label={t.search.placeholder}
        />
      </div>
      <CommandList className="max-h-[60vh] sm:max-h-[300px]">
        {/* Loading state */}
        {isLoading && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {language === 'vi' ? 'Đang tìm kiếm...' : 'Searching...'}
          </div>
        )}

        {/* No results state */}
        {showEmpty && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {t.search.noResults}
          </div>
        )}

        {/* Search Results */}
        {showSearchResults && results.length > 0 && (
          <CommandGroup heading={language === 'vi' ? 'Kết quả tìm kiếm' : 'Search Results'}>
            {results.map((result) => (
              <CommandItem
                key={result.id}
                value={result.title}
                onSelect={() => handleSelect(result.href)}
                className="group flex items-center gap-3 py-3 sm:py-2"
              >
                <Search
                  className="h-4 w-4 text-muted-foreground group-data-[selected=true]:text-primary-foreground shrink-0"
                  aria-hidden="true"
                />
                <div className="flex flex-col min-w-0">
                  <span className="truncate font-medium">{result.title}</span>
                  <span className="text-xs text-muted-foreground group-data-[selected=true]:text-primary-foreground/80 truncate hidden sm:block">
                    {result.description}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Quick Links - only show when no search */}
        {showQuickLinks && (
          <CommandGroup heading={t.search.quickLinks}>
            <CommandItem
              onSelect={() => handleSelect(`/tai-lieu/${language}/quickstart`)}
              className="group flex items-center gap-3 py-3 sm:py-2"
            >
              <Hash
                className="h-4 w-4 text-muted-foreground group-data-[selected=true]:text-primary-foreground"
                aria-hidden="true"
              />
              <span>{t.search.gettingStarted}</span>
            </CommandItem>
            <CommandItem 
              onSelect={() => handleSelect(`/tai-lieu/${language}/cli`)} 
              className="group flex items-center gap-3 py-3 sm:py-2"
            >
              <Hash
                className="h-4 w-4 text-muted-foreground group-data-[selected=true]:text-primary-foreground"
                aria-hidden="true"
              />
              <span>{t.search.cliReference}</span>
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}