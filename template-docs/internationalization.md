# Internationalization (i18n) Guide

This guide covers how to add multi-language support to your documentation site.

## Overview

The template supports internationalization through:
- Next.js App Router i18n routing
- Locale-based content organization
- Language selector component (pre-built)
- URL-based language switching

## Architecture Options

### Option A: Subdirectory Routing (Recommended)

\`\`\`
/docs/quickstart        → English (default)
/es/docs/quickstart     → Spanish
/fr/docs/quickstart     → French
\`\`\`

### Option B: Domain-based Routing

\`\`\`
docs.example.com        → English
docs.example.es         → Spanish
docs.example.fr         → French
\`\`\`

This guide focuses on **Option A** (subdirectory routing).

---

## Phase 1: Configuration Setup

### 1.1 Create i18n Configuration

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

### 1.2 Create Middleware for Locale Detection

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
  
  // For default locale, don't redirect - serve content directly
  if (locale === defaultLocale) {
    return NextResponse.next()
  }

  // Redirect non-default locales to prefixed path
  const newUrl = new URL(`/${locale}${pathname}`, request.url)
  return NextResponse.redirect(newUrl)
}

export const config = {
  matcher: [
    // Skip internal paths
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
}
\`\`\`

---

## Phase 2: App Router Structure

### 2.1 Create Locale-based Route Groups

Restructure your `app` directory:

\`\`\`
app/
├── (default)/                    # Default locale (English)
│   ├── layout.tsx
│   ├── page.tsx
│   └── docs/
│       ├── page.tsx
│       └── [...slug]/
│           └── page.tsx
├── [locale]/                     # Other locales
│   ├── layout.tsx
│   ├── page.tsx
│   └── docs/
│       ├── page.tsx
│       └── [...slug]/
│           └── page.tsx
└── layout.tsx                    # Root layout
\`\`\`

### 2.2 Create Locale Layout

Create `app/[locale]/layout.tsx`:

\`\`\`typescript
import { notFound } from 'next/navigation'
import { locales, type Locale } from '@/lib/i18n'

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export async function generateStaticParams() {
  return locales
    .filter(locale => locale !== 'en') // Default handled by (default) group
    .map(locale => ({ locale }))
}

export default async function LocaleLayout({ 
  children, 
  params 
}: LocaleLayoutProps) {
  const { locale } = await params
  
  if (!locales.includes(locale as Locale)) {
    notFound()
  }

  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  )
}
\`\`\`

---

## Phase 3: Content Organization

### 3.1 Organize Translated Content

Create locale-specific content in `lib/docs/`:

\`\`\`
lib/docs/
├── pages.ts                # Default (English) content
├── pages.es.ts             # Spanish content
├── pages.fr.ts             # French content
├── nav.ts                  # Default navigation
├── nav.es.ts               # Spanish navigation
└── nav.fr.ts               # French navigation
\`\`\`

### 3.2 Create Content Loader

Create `lib/docs/content.ts`:

\`\`\`typescript
import { type Locale, defaultLocale } from '@/lib/i18n'

// Import all locale content
import { pages as pagesEn } from './pages'
import { pages as pagesEs } from './pages.es'
import { pages as pagesFr } from './pages.fr'

import { navigation as navEn } from './nav'
import { navigation as navEs } from './nav.es'
import { navigation as navFr } from './nav.fr'

const pagesMap: Record<Locale, typeof pagesEn> = {
  en: pagesEn,
  es: pagesEs,
  fr: pagesFr,
  de: pagesEn, // Fallback to English
  ja: pagesEn,
  zh: pagesEn,
}

const navigationMap: Record<Locale, typeof navEn> = {
  en: navEn,
  es: navEs,
  fr: navFr,
  de: navEn,
  ja: navEn,
  zh: navEn,
}

export function getPages(locale: Locale = defaultLocale) {
  return pagesMap[locale] || pagesMap[defaultLocale]
}

export function getNavigation(locale: Locale = defaultLocale) {
  return navigationMap[locale] || navigationMap[defaultLocale]
}

export function getPage(slug: string, locale: Locale = defaultLocale) {
  const pages = getPages(locale)
  return pages.find(p => p.slug === slug)
}
\`\`\`

### 3.3 Example Translated Content

Create `lib/docs/pages.es.ts`:

\`\`\`typescript
export const pages = [
  {
    slug: "quickstart",
    title: "Inicio Rápido",
    description: "Pon en marcha tu sitio de documentación en menos de 5 minutos.",
    content: `
# Inicio Rápido

Pon en marcha tu sitio de documentación en menos de 5 minutos.

## Paso 1: Instalar el CLI

\`\`\`bash
npm install -g @docs/cli
\`\`\`

## Paso 2: Inicializar tu proyecto

\`\`\`bash
docs init mi-documentacion
cd mi-documentacion
\`\`\`

## Paso 3: Iniciar el servidor de desarrollo

\`\`\`bash
docs dev
\`\`\`

Tu sitio de documentación está ahora corriendo en \`http://localhost:3000\`.
    `
  },
  // ... more translated pages
]
\`\`\`

---

## Phase 4: Update Components

### 4.1 Update Language Selector

The template includes a language selector. Update it to actually switch locales:

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
    // Remove current locale prefix if present
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

    // Add new locale prefix (skip for default)
    if (newLocale !== defaultLocale) {
      newPath = `/${newLocale}${newPath}`
    }

    // Set cookie for persistence
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`
    
    router.push(newPath)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 gap-2 px-2"
        >
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

### 4.2 Create Locale Context (Optional)

For components that need locale access without URL parsing:

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

## Phase 5: Update Doc Pages

### 5.1 Update Dynamic Doc Page

Update `app/[locale]/docs/[...slug]/page.tsx`:

\`\`\`typescript
import { notFound } from "next/navigation"
import { getPage, getPages } from "@/lib/docs/content"
import { type Locale, isValidLocale } from "@/lib/i18n"
import { DocContent } from "@/components/docs/doc-content"

interface DocPageProps {
  params: Promise<{ 
    locale: string
    slug: string[] 
  }>
}

export async function generateStaticParams() {
  const pages = getPages('en')
  return pages.map(page => ({
    slug: page.slug.split('/'),
  }))
}

export async function generateMetadata({ params }: DocPageProps) {
  const { locale, slug } = await params
  const validLocale = isValidLocale(locale) ? locale : 'en'
  const page = getPage(slug.join('/'), validLocale)

  if (!page) {
    return { title: 'Not Found' }
  }

  return {
    title: `${page.title} | Docs`,
    description: page.description,
  }
}

export default async function DocPage({ params }: DocPageProps) {
  const { locale, slug } = await params
  const validLocale: Locale = isValidLocale(locale) ? locale : 'en'
  const page = getPage(slug.join('/'), validLocale)

  if (!page) {
    notFound()
  }

  return (
    <DocContent
      title={page.title}
      description={page.description}
      content={page.content}
      slug={slug.join('/')}
    />
  )
}
\`\`\`

---

## Phase 6: UI Translations

### 6.1 Create UI Translations File

Create `lib/translations.ts`:

\`\`\`typescript
import { type Locale } from './i18n'

type TranslationKey = 
  | 'search.placeholder'
  | 'search.noResults'
  | 'nav.getStarted'
  | 'nav.documentation'
  | 'nav.guides'
  | 'nav.apiReference'
  | 'nav.changelog'
  | 'footer.copyright'
  | 'assistant.placeholder'
  | 'copyPage'
  | 'copied'

const translations: Record<Locale, Record<TranslationKey, string>> = {
  en: {
    'search.placeholder': 'Search documentation...',
    'search.noResults': 'No results found.',
    'nav.getStarted': 'Get started',
    'nav.documentation': 'Documentation',
    'nav.guides': 'Guides',
    'nav.apiReference': 'API reference',
    'nav.changelog': 'Changelog',
    'footer.copyright': 'All rights reserved.',
    'assistant.placeholder': 'Ask a question...',
    'copyPage': 'Copy page',
    'copied': 'Copied!',
  },
  es: {
    'search.placeholder': 'Buscar documentación...',
    'search.noResults': 'No se encontraron resultados.',
    'nav.getStarted': 'Comenzar',
    'nav.documentation': 'Documentación',
    'nav.guides': 'Guías',
    'nav.apiReference': 'Referencia API',
    'nav.changelog': 'Historial de cambios',
    'footer.copyright': 'Todos los derechos reservados.',
    'assistant.placeholder': 'Haz una pregunta...',
    'copyPage': 'Copiar página',
    'copied': '¡Copiado!',
  },
  fr: {
    'search.placeholder': 'Rechercher dans la documentation...',
    'search.noResults': 'Aucun résultat trouvé.',
    'nav.getStarted': 'Commencer',
    'nav.documentation': 'Documentation',
    'nav.guides': 'Guides',
    'nav.apiReference': 'Référence API',
    'nav.changelog': 'Journal des modifications',
    'footer.copyright': 'Tous droits réservés.',
    'assistant.placeholder': 'Posez une question...',
    'copyPage': 'Copier la page',
    'copied': 'Copié !',
  },
  de: {
    'search.placeholder': 'Dokumentation durchsuchen...',
    'search.noResults': 'Keine Ergebnisse gefunden.',
    'nav.getStarted': 'Loslegen',
    'nav.documentation': 'Dokumentation',
    'nav.guides': 'Anleitungen',
    'nav.apiReference': 'API-Referenz',
    'nav.changelog': 'Änderungsprotokoll',
    'footer.copyright': 'Alle Rechte vorbehalten.',
    'assistant.placeholder': 'Stelle eine Frage...',
    'copyPage': 'Seite kopieren',
    'copied': 'Kopiert!',
  },
  ja: {
    'search.placeholder': 'ドキュメントを検索...',
    'search.noResults': '結果が見つかりません。',
    'nav.getStarted': '始める',
    'nav.documentation': 'ドキュメント',
    'nav.guides': 'ガイド',
    'nav.apiReference': 'APIリファレンス',
    'nav.changelog': '変更履歴',
    'footer.copyright': '全著作権所有。',
    'assistant.placeholder': '質問する...',
    'copyPage': 'ページをコピー',
    'copied': 'コピーしました！',
  },
  zh: {
    'search.placeholder': '搜索文档...',
    'search.noResults': '未找到结果。',
    'nav.getStarted': '开始使用',
    'nav.documentation': '文档',
    'nav.guides': '指南',
    'nav.apiReference': 'API参考',
    'nav.changelog': '更新日志',
    'footer.copyright': '保留所有权利。',
    'assistant.placeholder': '提问...',
    'copyPage': '复制页面',
    'copied': '已复制！',
  },
}

export function t(key: TranslationKey, locale: Locale = 'en'): string {
  return translations[locale]?.[key] || translations.en[key] || key
}

export function useTranslations(locale: Locale) {
  return (key: TranslationKey) => t(key, locale)
}
\`\`\`

### 6.2 Usage in Components

\`\`\`typescript
import { useLocale } from '@/lib/locale-context'
import { t } from '@/lib/translations'

function SearchInput() {
  const locale = useLocale()
  
  return (
    <input 
      placeholder={t('search.placeholder', locale)}
    />
  )
}
\`\`\`

---

## Phase 7: SEO for Multilingual

### 7.1 Add Alternate Language Links

Update your layout to include hreflang tags:

\`\`\`typescript
import { locales, defaultLocale } from '@/lib/i18n'

export async function generateMetadata({ params }) {
  const { locale } = await params
  const currentLocale = locale || defaultLocale
  
  // Generate alternate language URLs
  const languages: Record<string, string> = {}
  for (const loc of locales) {
    const prefix = loc === defaultLocale ? '' : `/${loc}`
    languages[loc] = `https://yourdomain.com${prefix}/docs`
  }

  return {
    alternates: {
      languages,
    },
  }
}
\`\`\`

### 7.2 Update Sitemap

Update `app/sitemap.ts`:

\`\`\`typescript
import { MetadataRoute } from 'next'
import { getPages } from '@/lib/docs/content'
import { locales, defaultLocale } from '@/lib/i18n'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://yourdomain.com'
  const pages = getPages()
  const entries: MetadataRoute.Sitemap = []

  // Add entries for each page in each locale
  for (const page of pages) {
    for (const locale of locales) {
      const prefix = locale === defaultLocale ? '' : `/${locale}`
      
      entries.push({
        url: `${baseUrl}${prefix}/docs/${page.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
        alternates: {
          languages: Object.fromEntries(
            locales.map(loc => [
              loc,
              `${baseUrl}${loc === defaultLocale ? '' : `/${loc}`}/docs/${page.slug}`
            ])
          ),
        },
      })
    }
  }

  return entries
}
\`\`\`

---

## Phase 8: Translation Workflow

### 8.1 Manual Translation

For small projects, manually create translated content files:

1. Copy `lib/docs/pages.ts` to `lib/docs/pages.{locale}.ts`
2. Translate all content
3. Import in `lib/docs/content.ts`

### 8.2 Using Translation Services

For larger projects, consider:

- **Crowdin**: https://crowdin.com
- **Lokalise**: https://lokalise.com
- **Phrase**: https://phrase.com

### 8.3 AI-Assisted Translation Script

Create `scripts/translate.ts`:

\`\`\`typescript
import { generateText } from 'ai'
import { pages } from '../lib/docs/pages'
import fs from 'fs'

const targetLocale = process.argv[2] || 'es'

async function translateContent(content: string, targetLang: string) {
  const { text } = await generateText({
    model: 'openai/gpt-4o',
    prompt: `Translate the following documentation content to ${targetLang}. 
Preserve all markdown formatting, code blocks, and technical terms.
Do not translate code, URLs, or file paths.

Content:
${content}`,
  })
  
  return text
}

async function translatePages() {
  const translatedPages = []
  
  for (const page of pages) {
    console.log(`Translating: ${page.title}`)
    
    const translatedTitle = await translateContent(page.title, targetLocale)
    const translatedDescription = await translateContent(page.description, targetLocale)
    const translatedContent = await translateContent(page.content, targetLocale)
    
    translatedPages.push({
      slug: page.slug,
      title: translatedTitle,
      description: translatedDescription,
      content: translatedContent,
    })
  }
  
  const output = `export const pages = ${JSON.stringify(translatedPages, null, 2)}`
  fs.writeFileSync(`lib/docs/pages.${targetLocale}.ts`, output)
  
  console.log(`Translation complete: lib/docs/pages.${targetLocale}.ts`)
}

translatePages()
\`\`\`

Run with:

\`\`\`bash
npx tsx scripts/translate.ts es
npx tsx scripts/translate.ts fr
\`\`\`

---

## Checklist

- [ ] Create `lib/i18n.ts` configuration
- [ ] Add `middleware.ts` for locale detection
- [ ] Restructure app directory with locale groups
- [ ] Create locale-specific content files
- [ ] Create content loader with fallbacks
- [ ] Update language selector component
- [ ] Add UI translations
- [ ] Configure SEO with hreflang tags
- [ ] Update sitemap for all locales
- [ ] Set up translation workflow

---

## Resources

- [Next.js i18n Documentation](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- [Google Multilingual SEO Guide](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [MDN: Language Tags](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/lang)
