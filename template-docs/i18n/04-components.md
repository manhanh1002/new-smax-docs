# Phase 4: Component Updates

## 4.1 Update Language Selector

Update `components/layout/language-selector.tsx`:

\`\`\`typescript
"use client"

import { usePathname, useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Globe } from "lucide-react"
import { 
  locales, 
  localeNames, 
  localeFlags,
  defaultLocale,
  getLocaleFromPath,
  type Locale 
} from '@/lib/i18n'

export function LanguageSelector() {
  const pathname = usePathname()
  const router = useRouter()
  const currentLocale = getLocaleFromPath(pathname)

  function switchLocale(newLocale: Locale) {
    let newPath = pathname
    
    for (const locale of locales) {
      if (pathname.startsWith(`/${locale}/`)) {
        newPath = pathname.replace(`/${locale}`, '')
        break
      } else if (pathname === `/${locale}`) {
        newPath = '/'
        break
      }
    }

    if (newLocale !== defaultLocale) {
      newPath = `/${newLocale}${newPath}`
    }

    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`
    router.push(newPath)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-2 px-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">
            {localeFlags[currentLocale]} {localeNames[currentLocale]}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => switchLocale(locale)}
            className={currentLocale === locale ? 'bg-accent' : ''}
          >
            <span className="mr-2">{localeFlags[locale]}</span>
            {localeNames[locale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
\`\`\`

## 4.2 Create Locale Context (Optional)

Create `lib/locale-context.tsx`:

\`\`\`typescript
"use client"

import { createContext, useContext } from 'react'
import { type Locale, defaultLocale } from '@/lib/i18n'

const LocaleContext = createContext<Locale>(defaultLocale)

export function LocaleProvider({ 
  locale, 
  children 
}: { 
  locale: Locale
  children: React.ReactNode 
}) {
  return (
    <LocaleContext.Provider value={locale}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
\`\`\`

---

Next: [Phase 5: UI Translations](./05-translations.md)
