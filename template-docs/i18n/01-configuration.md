# Phase 1: Configuration Setup

## 1.1 Create i18n Configuration

Create `lib/i18n.ts`:

\`\`\`typescript
export const locales = ['en', 'es', 'fr', 'de', 'ja', 'zh'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  zh: '中文',
}

export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  ja: '🇯🇵',
  zh: '🇨🇳',
}

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale)
}

export function getLocaleFromPath(pathname: string): Locale {
  const segments = pathname.split('/')
  const potentialLocale = segments[1]
  
  if (isValidLocale(potentialLocale)) {
    return potentialLocale
  }
  
  return defaultLocale
}
\`\`\`

## 1.2 Create Middleware for Locale Detection

Create `middleware.ts`:

\`\`\`typescript
import { NextRequest, NextResponse } from 'next/server'
import { locales, defaultLocale, isValidLocale } from '@/lib/i18n'

function getPreferredLocale(request: NextRequest): string {
  // Check cookie first
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
  if (cookieLocale && isValidLocale(cookieLocale)) {
    return cookieLocale
  }

  // Check Accept-Language header
  const acceptLanguage = request.headers.get('Accept-Language')
  if (acceptLanguage) {
    const preferredLocales = acceptLanguage
      .split(',')
      .map(lang => lang.split(';')[0].trim().substring(0, 2))
    
    for (const lang of preferredLocales) {
      if (isValidLocale(lang)) {
        return lang
      }
    }
  }

  return defaultLocale
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if pathname has a locale
  const pathnameHasLocale = locales.some(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (pathnameHasLocale) {
    return NextResponse.next()
  }

  // Redirect to locale-prefixed path (skip for default locale)
  const locale = getPreferredLocale(request)
  
  if (locale === defaultLocale) {
    return NextResponse.next()
  }

  const newUrl = new URL(`/${locale}${pathname}`, request.url)
  return NextResponse.redirect(newUrl)
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
}
\`\`\`

---

Next: [Phase 2: App Router Structure](./02-routing.md)
