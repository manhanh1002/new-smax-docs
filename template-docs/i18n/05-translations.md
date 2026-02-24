# Phase 5: UI Translations

## 5.1 Create UI Translations File

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
    'search.placeholder': 'Rechercher...',
    'search.noResults': 'Aucun résultat.',
    'nav.getStarted': 'Commencer',
    'nav.documentation': 'Documentation',
    'nav.guides': 'Guides',
    'nav.apiReference': 'Référence API',
    'nav.changelog': 'Modifications',
    'footer.copyright': 'Tous droits réservés.',
    'assistant.placeholder': 'Posez une question...',
    'copyPage': 'Copier la page',
    'copied': 'Copié !',
  },
  de: {
    'search.placeholder': 'Suchen...',
    'search.noResults': 'Keine Ergebnisse.',
    'nav.getStarted': 'Loslegen',
    'nav.documentation': 'Dokumentation',
    'nav.guides': 'Anleitungen',
    'nav.apiReference': 'API-Referenz',
    'nav.changelog': 'Änderungen',
    'footer.copyright': 'Alle Rechte vorbehalten.',
    'assistant.placeholder': 'Frage stellen...',
    'copyPage': 'Seite kopieren',
    'copied': 'Kopiert!',
  },
  ja: {
    'search.placeholder': '検索...',
    'search.noResults': '結果なし',
    'nav.getStarted': '始める',
    'nav.documentation': 'ドキュメント',
    'nav.guides': 'ガイド',
    'nav.apiReference': 'API',
    'nav.changelog': '変更履歴',
    'footer.copyright': '全著作権所有',
    'assistant.placeholder': '質問する...',
    'copyPage': 'コピー',
    'copied': 'コピー済',
  },
  zh: {
    'search.placeholder': '搜索...',
    'search.noResults': '无结果',
    'nav.getStarted': '开始',
    'nav.documentation': '文档',
    'nav.guides': '指南',
    'nav.apiReference': 'API',
    'nav.changelog': '更新',
    'footer.copyright': '保留所有权利',
    'assistant.placeholder': '提问...',
    'copyPage': '复制',
    'copied': '已复制',
  },
}

export function t(key: TranslationKey, locale: Locale = 'en'): string {
  return translations[locale]?.[key] || translations.en[key] || key
}

export function useTranslations(locale: Locale) {
  return (key: TranslationKey) => t(key, locale)
}
\`\`\`

## 5.2 Usage in Components

\`\`\`typescript
import { useLocale } from '@/lib/locale-context'
import { t } from '@/lib/translations'

function SearchInput() {
  const locale = useLocale()
  
  return (
    <input placeholder={t('search.placeholder', locale)} />
  )
}
\`\`\`

---

Next: [Phase 6: SEO & Sitemap](./06-seo.md)
