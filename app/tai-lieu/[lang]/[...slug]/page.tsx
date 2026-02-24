import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getDocPage, getAllDocPages, getPagerForDocFromOutline } from "@/lib/docs/service"
import { DocContent } from "@/components/docs/doc-content"

interface DocPageProps {
  params: Promise<{
    slug: string[]
    lang: "vi" | "en"
  }>
}

export async function generateMetadata({ params }: DocPageProps): Promise<Metadata> {
  const { slug, lang } = await params
  const slugPath = slug.join("/")
  const page = await getDocPage(slugPath, lang)

  if (!page) {
    return {
      title: "Not Found",
      description: "The page you're looking for doesn't exist.",
    }
  }

  return {
    title: `${page.title} | Documentation`,
    description: page.description,
    openGraph: {
      title: page.title,
      description: page.description,
      type: "article",
    },
  }
}

export async function generateStaticParams() {
  const langs = ["vi", "en"] as const
  const params: { lang: string; slug: string[] }[] = []

  for (const lang of langs) {
    const pages = await getAllDocPages(lang)
    for (const page of pages) {
      if (page.slug !== "") {
        params.push({
          lang,
          slug: page.slug.split("/"),
        })
      }
    }
  }

  return params
}

export default async function SmaxDocsSlugPage({ params }: DocPageProps) {
  const { slug, lang } = await params
  const slugPath = slug.join("/")
  const page = await getDocPage(slugPath, lang)

  if (!page) {
    notFound()
  }

  // Get prev/next navigation from Outline
  const pager = await getPagerForDocFromOutline(slugPath, lang)

  return (
    <>
      <DocContent 
        title={page.title} 
        content={page.content} 
        slug={slugPath} 
        lastUpdated={page.last_updated}
        pager={pager}
      />
    </>
  )
}