// hooks/use-docs-navigation.ts
// Hook for fetching documentation navigation from database

import { useState, useEffect } from 'react'
import { navigation as staticNavigation, type NavSection, type NavItem } from '@/lib/docs/nav'

interface NavigationResponse {
  success: boolean
  navigation: DatabaseNavItem[]
  error?: string
}

interface DatabaseNavItem {
  id: string
  slug: string
  title: string
  path: string
  children?: DatabaseNavItem[]
}

// Convert database navigation to NavSection format
function convertToNavSections(items: DatabaseNavItem[], lang: string): NavSection[] {
  const mapItem = (item: DatabaseNavItem): NavItem => ({
    title: item.title,
    href: `/tai-lieu/${lang}/${item.slug}`,
    items: item.children && item.children.length > 0 
      ? item.children.map(mapItem) 
      : undefined,
    collapsible: item.children && item.children.length > 0 ? true : undefined
  })

  const navItems: NavItem[] = items.map(mapItem)

  return [{
    title: 'Documentation',
    items: navItems,
  }]
}

export function useDocsNavigation(lang: 'vi' | 'en' = 'vi') {
  const [data, setData] = useState<NavigationResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    
    async function fetchNavigation() {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/docs/navigation?lang=${lang}`)
        const result = await response.json()
        
        if (mounted) {
          setData(result)
          setError(result.error || null)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch navigation')
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    fetchNavigation()
    
    return () => {
      mounted = false
    }
  }, [lang])

  // If we have database navigation, use it; otherwise fall back to static
  const navigation: NavSection[] = data?.success && data.navigation.length > 0
    ? convertToNavSections(data.navigation, lang)
    : staticNavigation

  return {
    navigation,
    isLoading,
    error,
  }
}