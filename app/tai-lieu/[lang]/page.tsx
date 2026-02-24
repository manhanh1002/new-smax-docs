import { notFound } from "next/navigation"
import { getDocPage } from "@/lib/docs/service"
import { DocContent } from "@/components/docs/doc-content"

interface DocPageProps {
  params: Promise<{
    lang: "vi" | "en"
  }>
}

export default async function DocsIndexPage({ params }: DocPageProps) {
  const { lang } = await params
  const page = await getDocPage("", lang)

  if (!page) {
    notFound()
  }

  return <DocContent title={page.title} content={page.content} lastUpdated={page.last_updated} />
}