# Phase 2: App Router Structure

## 2.1 Create Locale-based Route Groups

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

## 2.2 Create Locale Layout

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
    .filter(locale => locale !== 'en')
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

## 2.3 Update Dynamic Doc Page

Create `app/[locale]/docs/[...slug]/page.tsx`:

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

Next: [Phase 3: Content Organization](./03-content.md)
