// lib/docs/service.ts
// Service layer for fetching documentation from Outline API

import { getOutlineDocuments, getOutlineDocument, type OutlineDocument } from '@/lib/outline'

export interface DocPage {
  id: string
  slug: string
  title: string
  description: string
  content: string
  language: string
  path: string
  parent_id: string | null
  external_id: string | null
  last_updated: string | null
  created_at: string | null
  breadcrumbs?: { title: string; href: string }[]
}

export interface DocTreeNode {
  id: string
  slug: string
  title: string
  path: string
  children?: DocTreeNode[]
}

// Get collection ID based on language
function getCollectionId(lang: 'vi' | 'en'): string {
  const id = lang === 'vi' 
    ? process.env.OUTLINE_COLLECTION_VI_ID 
    : process.env.OUTLINE_COLLECTION_EN_ID
  // Trim whitespace/newlines from env var
  return (id || '').trim()
}

// Helper to get breadcrumbs for a doc
async function getBreadcrumbs(doc: OutlineDocument, allDocs: OutlineDocument[], lang: string): Promise<{ title: string; href: string }[]> {
  const breadcrumbs: { title: string; href: string }[] = []
  
  let current = doc
  while (current.parentDocumentId) {
    const parent = allDocs.find(d => d.id === current.parentDocumentId)
    if (parent) {
      const parentPage = mapOutlineToDocPage(parent, lang)
      breadcrumbs.unshift({
        title: parentPage.title,
        href: `/tai-lieu/${lang}/${parentPage.slug}`
      })
      current = parent
    } else {
      break
    }
  }
  
  return breadcrumbs
}

// Get a single document by slug from Outline
export async function getDocPage(slug: string, lang: "vi" | "en" = "vi"): Promise<DocPage | null> {
  try {
    const collectionId = getCollectionId(lang)
    
    // Normalize slug - remove leading/trailing slashes and language prefix
    let normalizedSlug = slug.replace(/^\/+|\/+$/g, '') || ''
    // Strip language prefix if present (e.g., "vi/quickstart" -> "quickstart")
    normalizedSlug = normalizedSlug.replace(/^(vi|en)\//, '')
    
    // If slug contains slashes (nested path), take the last part
    // This is a simplification. Ideally we should match the full path.
    // But Outline doesn't enforce unique slugs across hierarchy, so last part is usually unique enough or we rely on ID.
    const lastSlugPart = normalizedSlug.split('/').pop() || normalizedSlug
    
    // Get all documents
    const documents = await getOutlineDocuments(collectionId)
    
    // Find document by matching slug (with stripped ID) or by Outline ID
    const doc = documents.find(d => {
      // Get slug from url field and strip ID
      let docSlug = ''
      if (d.url) {
        const urlParts = d.url.split('/')
        const lastPart = urlParts[urlParts.length - 1]
        docSlug = stripOutlineId(lastPart)
      }
      
      // Also get urlId for backward compatibility
      const urlId = d.urlId || ''
      
      // Extract ID from url if present
      const idMatch = d.url ? d.url.match(/-([a-zA-Z0-9]{8,12})$/) : null
      const outlineId = idMatch ? idMatch[1] : null

      // Also support matching by the "cleaned" slug if lastSlugPart is the cleaned version
      // but the doc in Outline still has the numbering
      const rawUrlPart = d.url ? d.url.split('/').pop() || '' : ''
      const docSlugCleaned = stripOutlineId(rawUrlPart)
      
      return docSlug === lastSlugPart || 
        rawUrlPart === lastSlugPart ||
        docSlugCleaned === lastSlugPart ||
        urlId === lastSlugPart ||
        outlineId === lastSlugPart ||
        generateSlug(d.title) === lastSlugPart
    })

    if (!doc) return null

    // Fetch full document details (including text content) from Outline API
    // The list API often omits full text content
    let docData = doc
    try {
      const fullDoc = await getOutlineDocument(doc.id)
      if (fullDoc) {
        docData = fullDoc
      } else {
        console.error(`Failed to fetch full document content for ${doc.id}`)
      }
    } catch (e) {
      console.error(`Error fetching full document for ${doc.id}:`, e)
    }

    // Map to DocPage
    const docPage = mapOutlineToDocPage(docData, lang)
    
    // Add breadcrumbs
    docPage.breadcrumbs = await getBreadcrumbs(doc, documents, lang)
    
    return docPage
  } catch (error) {
    console.error('Error fetching doc page from Outline:', error)
    return null
  }
}

// Get all documents for a language from Outline
export async function getAllDocPages(lang: "vi" | "en" = "vi"): Promise<DocPage[]> {
  try {
    const collectionId = getCollectionId(lang)
    const documents = await getOutlineDocuments(collectionId)
    
    return documents.map(doc => mapOutlineToDocPage(doc, lang))
  } catch (error) {
    console.error('Error fetching all doc pages from Outline:', error)
    return []
  }
}

// Get document tree for sidebar navigation from Outline
export async function getDocTree(lang: "vi" | "en" = "vi"): Promise<DocTreeNode[]> {
  const pages = await getAllDocPages(lang)
  
  // Build tree structure
  const rootNodes: DocTreeNode[] = []
  const nodeMap = new Map<string, DocTreeNode>()
  
  // First pass: create all nodes
  for (const page of pages) {
    const node: DocTreeNode = {
      id: page.id,
      slug: page.slug,
      title: page.title,
      path: page.path,
      children: [],
    }
    nodeMap.set(page.id, node)
  }
  
  // Second pass: build tree
  for (const page of pages) {
    const node = nodeMap.get(page.id)!
    
    if (page.parent_id && nodeMap.has(page.parent_id)) {
      const parent = nodeMap.get(page.parent_id)!
      parent.children!.push(node)
    } else {
      rootNodes.push(node)
    }
  }

  // Helper function for natural sort
  const naturalSort = (a: DocTreeNode, b: DocTreeNode) => {
    // Extract leading numbers from titles (e.g., "1. Intro", "1.10. Advanced")
    const getParts = (s: string) => {
      // Match number sequence at start (e.g., "1.10.2")
      const match = s.match(/^(\d+(\.\d+)*)/)
      if (!match) return null
      // Split by dot and convert to numbers
      return match[0].split('.').map(Number)
    }

    const partsA = getParts(a.title)
    const partsB = getParts(b.title)

    // If both have numbering
    if (partsA && partsB) {
      const len = Math.max(partsA.length, partsB.length)
      for (let i = 0; i < len; i++) {
        const valA = partsA[i] ?? 0
        const valB = partsB[i] ?? 0
        if (valA !== valB) {
          return valA - valB
        }
      }
      // If numbers are identical, fall back to title length (shorter is usually parent/main)
      // or alphabetical
      return a.title.localeCompare(b.title)
    }
    
    // If only one has number, prioritize numbered item
    if (partsA && !partsB) return -1
    if (!partsA && partsB) return 1

    // Fallback to alphabetical sort
    return a.title.localeCompare(b.title)
  }

  // Sort root nodes and children recursively
  const sortTree = (nodes: DocTreeNode[]) => {
    nodes.sort(naturalSort)
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        sortTree(node.children)
      }
    })
  }

  sortTree(rootNodes)
  
  return rootNodes
}

// Helper to generate slug from title
function generateSlug(title: string | undefined | null): string {
  if (!title) return ''
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Helper to strip Outline ID suffix from urlId
// Outline format: "ten-doc-ID" where ID is ~10 alphanumeric chars
// We want to return just "ten-doc"
function stripOutlineId(urlId: string): string {
  if (!urlId) return ''
  
  // Strip language prefix if present
  let clean = urlId.replace(/^(vi|en)\//, '')
  
  // Pattern: ends with "-XXXXXXXXXX" (dash followed by ~10 alphanumeric chars)
  // Match and remove the ID suffix
  const match = clean.match(/^(.+)-([a-zA-Z0-9]{8,12})$/)
  if (match) {
    return match[1] // Return just the name part (keep numbering if present)
  }
  
  return clean
}

// Helper to map Outline document to DocPage
function mapOutlineToDocPage(doc: OutlineDocument, lang: string): DocPage {
  // Get slug from url field (format: "/doc/ten-doc-ID")
  // Strip the "/doc/" prefix and the ID suffix
  let slug = ''
  
  if (doc.url) {
    // Extract from url: "/doc/1-cong-dong-ho-tro-oocCnuJP1G" -> "1-cong-dong-ho-tro"
    const urlParts = doc.url.split('/')
    const lastPart = urlParts[urlParts.length - 1] // "1-cong-dong-ho-tro-oocCnuJP1G"
    slug = stripOutlineId(lastPart) // "1-cong-dong-ho-tro"
  }
  
  // Fallback to title-based slug if url is empty
  if (!slug) {
    slug = generateSlug(doc.title)
  }
  
  return {
    id: doc.id,
    slug: slug,
    title: doc.title,
    description: doc.text?.substring(0, 200) || '',
    content: doc.text || '',
    language: lang,
    path: doc.url || '',
    parent_id: doc.parentDocumentId,
    external_id: doc.id,
    last_updated: doc.updatedAt,
    created_at: doc.createdAt || null,
  }
}

// Get pager (prev/next) for a document from Outline
// Only shows siblings (docs with same parent_id)
export async function getPagerForDocFromOutline(
  currentSlug: string, 
  lang: "vi" | "en" = "vi"
): Promise<{ prev: { title: string; href: string } | null; next: { title: string; href: string } | null }> {
  try {
    const pages = await getAllDocPages(lang)
    
    // Normalize current slug
    const normalizedSlug = currentSlug.replace(/^\/+|\/+$/g, '').replace(/^(vi|en)\//, '')
    
    // Find current document
    const currentDoc = pages.find(page => {
      const pageSlug = page.slug.replace(/^\/+|\/+$/g, '')
      return pageSlug === normalizedSlug || page.slug === normalizedSlug
    })
    
    if (!currentDoc) {
      return { prev: null, next: null }
    }
    
    // Get siblings: docs with same parent_id (excluding current doc)
    const siblings = pages.filter(page => 
      page.id !== currentDoc.id && // Exclude current doc
      page.parent_id === currentDoc.parent_id // Same parent
    )
    
    // If no siblings, return null
    if (siblings.length === 0) {
      return { prev: null, next: null }
    }
    
    // Sort siblings by last_updated (newest first)
    const sortedSiblings = [...siblings].sort((a, b) => {
      const dateA = a.last_updated ? new Date(a.last_updated).getTime() : 0
      const dateB = b.last_updated ? new Date(b.last_updated).getTime() : 0
      return dateB - dateA // Newest first
    })
    
    // Find current doc's position among siblings (by time)
    // Since current doc is not in siblings, we need to find where it would be
    const currentDate = currentDoc.last_updated ? new Date(currentDoc.last_updated).getTime() : 0
    
    // Find insertion point for current doc in sorted siblings
    let insertIndex = 0
    for (let i = 0; i < sortedSiblings.length; i++) {
      const siblingDate = sortedSiblings[i].last_updated ? new Date(sortedSiblings[i].last_updated!).getTime() : 0
      if (currentDate > siblingDate) {
        insertIndex = i
        break
      }
      insertIndex = i + 1
    }
    
    // Prev = older document (next in sorted array since newest first)
    // Next = newer document (prev in sorted array since newest first)
    const prevDoc = insertIndex < sortedSiblings.length ? sortedSiblings[insertIndex] : null
    const nextDoc = insertIndex > 0 ? sortedSiblings[insertIndex - 1] : null
    
    return {
      prev: prevDoc ? {
        title: prevDoc.title,
        href: `/tai-lieu/${lang}/${prevDoc.slug}`,
      } : null,
      next: nextDoc ? {
        title: nextDoc.title,
        href: `/tai-lieu/${lang}/${nextDoc.slug}`,
      } : null,
    }
  } catch (error) {
    console.error('Error getting pager from Outline:', error)
    return { prev: null, next: null }
  }
}

// Search documents by query using Outline search
export async function searchDocs(query: string, lang: "vi" | "en" = "vi"): Promise<DocPage[]> {
  try {
    const { searchOutlineDocuments } = await import('@/lib/outline')
    
    // Get collection ID for the language
    const collectionId = getCollectionId(lang)
    
    // Search with collectionId filter
    const results = await searchOutlineDocuments(query, collectionId)
    
    // Debug: log first result to see structure
    if (results.length > 0) {
      console.log('Search result sample:', JSON.stringify(results[0], null, 2))
    }
    
    // Filter out invalid results and map
    return results
      .filter(doc => doc && doc.id && doc.title) // Only valid docs
      .map(doc => mapOutlineToDocPage(doc, lang))
  } catch (error) {
    console.error('Error searching docs:', error)
    return []
  }
}
