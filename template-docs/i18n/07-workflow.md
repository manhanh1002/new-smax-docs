# Phase 7: Translation Workflow

## 7.1 Manual Translation

For small projects:

1. Copy `lib/docs/pages.ts` to `lib/docs/pages.{locale}.ts`
2. Translate all content
3. Import in `lib/docs/content.ts`

## 7.2 Using Translation Services

For larger projects:

- **Crowdin**: https://crowdin.com
- **Lokalise**: https://lokalise.com
- **Phrase**: https://phrase.com

## 7.3 AI-Assisted Translation Script

Create `scripts/translate.ts`:

\`\`\`typescript
import { generateText } from 'ai'
import { pages } from '../lib/docs/pages'
import fs from 'fs'

const targetLocale = process.argv[2] || 'es'

async function translateContent(content: string, targetLang: string) {
  const { text } = await generateText({
    model: 'openai/gpt-4o',
    prompt: `Translate to ${targetLang}. 
Preserve markdown, code blocks, technical terms.
Do not translate code, URLs, or file paths.

${content}`,
  })
  
  return text
}

async function translatePages() {
  const translatedPages = []
  
  for (const page of pages) {
    console.log(`Translating: ${page.title}`)
    
    translatedPages.push({
      slug: page.slug,
      title: await translateContent(page.title, targetLocale),
      description: await translateContent(page.description, targetLocale),
      content: await translateContent(page.content, targetLocale),
    })
  }
  
  const output = `export const pages = ${JSON.stringify(translatedPages, null, 2)}`
  fs.writeFileSync(`lib/docs/pages.${targetLocale}.ts`, output)
  
  console.log(`Done: lib/docs/pages.${targetLocale}.ts`)
}

translatePages()
\`\`\`

Run:

\`\`\`bash
npx tsx scripts/translate.ts es
npx tsx scripts/translate.ts fr
\`\`\`

---

Back to: [README](./README.md)
\`\`\`

\`\`\`md file="template-docs/internationalization.md" isDeleted="true"
...deleted...
