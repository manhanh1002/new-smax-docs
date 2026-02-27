
import { getOutlineDocuments, type OutlineDocument } from '@/lib/outline'
import { generateChatCompletion } from '@/lib/embeddings'

export interface ChangelogItem {
  id: string
  title: string
  content: string // HTML or Markdown content
  publishedAt: string
  slug: string
  description?: string
}

// Get collection ID for Changelog
function getChangelogCollectionId(): string {
  const id = process.env.OUTLINE_COLLECTION_CHANGELOG_ID
  return (id || '').trim()
}

// Fetch changelogs from Outline
export async function getChangelogs(lang: 'vi' | 'en' = 'vi'): Promise<ChangelogItem[]> {
  try {
    const collectionId = getChangelogCollectionId()
    if (!collectionId) {
      console.warn('OUTLINE_COLLECTION_CHANGELOG_ID is not set')
      return []
    }

    // Get documents from Outline
    const documents = await getOutlineDocuments(collectionId)
    
    // Sort by publishedAt or createdAt (newest first)
    const sortedDocs = documents.sort((a, b) => {
      const dateA = new Date(a.publishedAt || a.createdAt).getTime()
      const dateB = new Date(b.publishedAt || b.createdAt).getTime()
      return dateB - dateA
    })

    // Process documents
    const changelogs = await Promise.all(sortedDocs.map(async (doc) => {
      let title = doc.title
      let content = doc.text || ''
      let description = doc.text?.substring(0, 200) || ''

      // If language is English, translate content using AI
      if (lang === 'en') {
        try {
          // Check if we can/should cache translations (for now, live translation)
          // Ideally, we should store translations in DB or cache
          const translated = await translateChangelog(title, content)
          title = translated.title
          content = translated.content
          description = content.substring(0, 200)
        } catch (error) {
          console.error(`Error translating doc ${doc.id}:`, error)
          // Fallback to original content
        }
      }

      return {
        id: doc.id,
        title,
        content,
        publishedAt: doc.publishedAt || doc.createdAt,
        slug: doc.urlId || doc.id,
        description
      }
    }))

    return changelogs
  } catch (error) {
    console.error('Error fetching changelogs:', error)
    return []
  }
}

// Helper function to translate content using AI
async function translateChangelog(title: string, content: string): Promise<{ title: string, content: string }> {
  try {
    const prompt = `
    Translate the following Changelog update from Vietnamese to English.
    Keep the tone professional and concise.
    Maintain Markdown formatting.
    
    Title: ${title}
    
    Content:
    ${content}
    
    Return ONLY a JSON object with "title" and "content" fields. Do not include Markdown code blocks in the response.
    `

    const messages = [
      { role: 'system' as const, content: 'You are a professional translator for software documentation.' },
      { role: 'user' as const, content: prompt }
    ]

    const response = await generateChatCompletion(messages) as string
    
    // Parse JSON response
    try {
      // Remove potential markdown code blocks if AI adds them
      const cleanResponse = response.replace(/```json/g, '').replace(/```/g, '').trim()
      return JSON.parse(cleanResponse)
    } catch (e) {
      console.error('Error parsing translation response:', e)
      return { title, content } // Fallback
    }
  } catch (error) {
    console.error('Translation API error:', error)
    return { title, content }
  }
}
