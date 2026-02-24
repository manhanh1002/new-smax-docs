# Internationalization (i18n) Guide

Add multi-language support to your documentation site.

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

## Implementation Phases

| Phase | Description | File |
|-------|-------------|------|
| 1 | Configuration Setup | [01-configuration.md](./01-configuration.md) |
| 2 | App Router Structure | [02-routing.md](./02-routing.md) |
| 3 | Content Organization | [03-content.md](./03-content.md) |
| 4 | Component Updates | [04-components.md](./04-components.md) |
| 5 | UI Translations | [05-translations.md](./05-translations.md) |
| 6 | SEO & Sitemap | [06-seo.md](./06-seo.md) |
| 7 | Translation Workflow | [07-workflow.md](./07-workflow.md) |

## Quick Start Checklist

- [ ] Create `lib/i18n.ts` configuration
- [ ] Add `middleware.ts` for locale detection
- [ ] Restructure app directory with locale groups
- [ ] Create locale-specific content files
- [ ] Update language selector component
- [ ] Add UI translations
- [ ] Configure SEO with hreflang tags
- [ ] Set up translation workflow

## Resources

- [Next.js i18n Documentation](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- [Google Multilingual SEO Guide](https://developers.google.com/search/docs/specialty/international/localized-versions)
