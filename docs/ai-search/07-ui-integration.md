# Phase 7: UI Components

## Search Hook

\`\`\`typescript
// hooks/use-ai-search.ts
'use client'

import { useState, useEffect } from 'react'
import { useDebounce } from '@/hooks/use-debounce'

export function useAISearch(debounceMs = 300) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  
  const debouncedQuery = useDebounce(query, debounceMs)

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([])
      return
    }

    setIsLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data) => setResults(data.results))
      .finally(() => setIsLoading(false))
  }, [debouncedQuery])

  return { query, setQuery, results, isLoading }
}
\`\`\`

## Chat Hook

\`\`\`typescript
// hooks/use-ai-chat.ts
'use client'

import { useChat } from 'ai/react'

export function useAIChat() {
  return useChat({ api: '/api/chat' })
}
\`\`\`

## Search Results Component

\`\`\`typescript
// components/search/ai-search-results.tsx
'use client'

import { FileText, Sparkles } from 'lucide-react'
import { CommandGroup, CommandItem } from '@/components/ui/command'
import { useRouter } from 'next/navigation'

export function AISearchResults({ results, isLoading, onSelect }) {
  const router = useRouter()

  if (isLoading) {
    return (
      <CommandGroup heading="AI Search">
        <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 animate-pulse" />
          Searching...
        </div>
      </CommandGroup>
    )
  }

  if (!results.length) return null

  return (
    <CommandGroup heading="AI Results">
      {results.map((result) => (
        <CommandItem
          key={result.id}
          onSelect={() => {
            router.push(`/docs/${result.slug}`)
            onSelect()
          }}
          className="group"
        >
          <FileText className="mr-2 h-4 w-4" />
          <div className="flex flex-col">
            <span className="font-medium">{result.title}</span>
            <span className="text-xs text-muted-foreground line-clamp-1">
              {result.highlights[0]}
            </span>
          </div>
          <span className="ml-auto text-xs text-muted-foreground">
            {Math.round(result.score * 100)}%
          </span>
        </CommandItem>
      ))}
    </CommandGroup>
  )
}
\`\`\`

## Next Step

→ [Phase 8: Deployment](./08-deployment.md)
