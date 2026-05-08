import { navigation, type NavItem } from "@/lib/docs/nav"

export function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, "") // Trim - from end of text
}

/**
 * Helper to strip Outline ID suffix from urlId
 * Outline format: "ten-doc-ID" where ID is ~10-12 alphanumeric chars
 */
export function stripOutlineId(urlId: string): string {
  if (!urlId) return ""

  // Strip language prefix if present
  let clean = urlId.replace(/^(vi|en)\//, "")

  // Pattern: ends with "-XXXXXXXXXX" (dash followed by ~10-12 alphanumeric chars)
  const match = clean.match(/^(.+)-([a-zA-Z0-9]{8,12})$/)
  if (match) {
    clean = match[1]
  }

  return clean
}

/**
 * Helper to strip leading numbers from slug
 * e.g. "1-gioi-thieu" -> "gioi-thieu"
 */
export function stripLeadingNumber(slug: string): string {
  if (!slug) return ""
  return slug.replace(/^\d+-/, "")
}

/**
 * Helper to clean an Outline path or slug fully
 * Extracts the last part, removes ID and leading numbers
 */
export function cleanOutlineSlug(path: string): string {
  if (!path) return ""

  // Remove /doc/ prefix if present
  let clean = path.replace(/^\/?doc\//, "")

  // Take only the last segment if it's a full path
  const segments = clean.split("/")
  const lastPart = segments[segments.length - 1]

  // Clean ID and leading numbers
  const withoutId = stripOutlineId(lastPart)
  return stripLeadingNumber(withoutId)
}

// Strip markdown syntax and HTML from text
export function stripMarkdown(text: string): string {
  if (!text) return ""
  return text
    // Remove HTML tags
    .replace(/<[^>]*>/g, "")
    // Remove custom IDs like {#custom-id}
    .replace(/\{#.*?\}/g, "")
    // Remove bold/italic
    .replace(/\*\*\*(.*?)\*\*\*/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/___(.*?)___/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    // Remove links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove inline code
    .replace(/`([^`]+)`/g, "$1")
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "")
    // Remove header markers
    .replace(/^#+\s*/gm, "")
    // Clean up extra whitespace
    .trim()
}

export interface TOCItem {
  title: string
  url: string
  depth: number
}

export function extractTOC(content: string): TOCItem[] {
  const normalizedContent = (content || "").replace(/\\n/g, "\n")
  const lines = normalizedContent.split("\n")
  const toc: TOCItem[] = []

  lines.forEach((line) => {
    const trimmedLine = line.trim()
    // Match # to #### headings
    const match = trimmedLine.match(/^(#{1,4})\s+(.+)$/)
    
    if (match) {
      const level = match[1].length
      const rawTitle = match[2].trim()
      
      // Skip headings that are just images or empty
      if (!rawTitle || rawTitle.startsWith("![")) return

      const title = stripMarkdown(rawTitle)
      if (!title) return

      toc.push({
        title,
        url: `#${slugify(title)}`,
        depth: level,
      })
    }
  })

  return toc
}

// Calculate reading time (average 200 words per minute)
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200
  const normalizedContent = (content || '').replace(/\\n/g, ' ')
  const words = normalizedContent.trim().split(/\s+/).length
  return Math.ceil(words / wordsPerMinute)
}

export function getPagerForDoc(slug: string) {
  const flattenedLinks: { title: string; href: string }[] = []

  function flatten(items: NavItem[]) {
    items.forEach((item) => {
      if (item.href && (!item.items || item.items.length === 0)) {
        flattenedLinks.push({ title: item.title, href: item.href })
      }
      if (item.items) {
        flatten(item.items)
      }
    })
  }

  navigation.forEach((section) => {
    flatten(section.items)
  })

  // Normalize slug to ensure it starts with / if needed
  const normalizedSlug = slug.startsWith("/") ? slug : `/${slug}`
  
  const activeIndex = flattenedLinks.findIndex(
    (link) => link.href === normalizedSlug
  )

  const prev = activeIndex > 0 ? flattenedLinks[activeIndex - 1] : null
  const next = activeIndex !== -1 && activeIndex < flattenedLinks.length - 1 ? flattenedLinks[activeIndex + 1] : null

  return { prev, next }
}