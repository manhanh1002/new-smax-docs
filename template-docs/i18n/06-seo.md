# Phase 6: SEO & Sitemap

## 6.1 Add Alternate Language Links

Update your layout to include hreflang tags:

\`\`\`typescript
import { locales, defaultLocale } from '@/lib/i18n'

export async function generateMetadata({ params }) {
  const { locale } = await params
  const currentLocale = locale || defaultLocale
  
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

## 6.2 Update Sitemap

Update `app/sitemap.ts`:

\`\`\`typescript
import { MetadataRoute } from 'next'
import { getPages } from '@/lib/docs/content'
import { locales, defaultLocale } from '@/lib/i18n'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://yourdomain.com'
  const pages = getPages()
  const entries: MetadataRoute.Sitemap = []

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

Next: [Phase 7: Translation Workflow](./07-workflow.md)
