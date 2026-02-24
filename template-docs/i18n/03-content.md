# Phase 3: Content Organization

## 3.1 Organize Translated Content

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

## 3.2 Create Content Loader

Create `lib/docs/content.ts`:

\`\`\`typescript
import { type Locale, defaultLocale } from '@/lib/i18n'

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

## 3.3 Example Translated Content

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

Next: [Phase 4: Component Updates](./04-components.md)
