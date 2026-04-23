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

// Strip markdown syntax from text
export function stripMarkdown(text: string): string {
  return text
    // Remove bold/italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/___(.*?)___/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    // Remove links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Remove headers markers
    .replace(/^#+\s*/gm, '')
    // Clean up extra whitespace
    .trim()
}

export interface TOCItem {
  title: string
  url: string
  depth: number
}

export function extractTOC(content: string): TOCItem[] {
  const normalizedContent = (content || '').replace(/\\n/g, '\n')
  const lines = normalizedContent.split("\n")
  const toc: TOCItem[] = []

  lines.forEach((line) => {
    if (line.startsWith("# ") && !line.startsWith("## ")) {
      // H1 heading
      const rawTitle = line.slice(2).trim()
      const title = stripMarkdown(rawTitle)
      toc.push({
        title,
        url: `#${slugify(title)}`,
        depth: 1,
      })
    } else if (line.startsWith("## ") && !line.startsWith("### ")) {
      // H2 heading
      const rawTitle = line.slice(3).trim()
      const title = stripMarkdown(rawTitle)
      toc.push({
        title,
        url: `#${slugify(title)}`,
        depth: 2,
      })
    } else if (line.startsWith("### ") && !line.startsWith("#### ")) {
      // H3 heading
      const rawTitle = line.slice(4).trim()
      const title = stripMarkdown(rawTitle)
      toc.push({
        title,
        url: `#${slugify(title)}`,
        depth: 3,
      })
    } else if (line.startsWith("#### ")) {
      // H4 heading
      const rawTitle = line.slice(5).trim()
      const title = stripMarkdown(rawTitle)
      toc.push({
        title,
        url: `#${slugify(title)}`,
        depth: 4,
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