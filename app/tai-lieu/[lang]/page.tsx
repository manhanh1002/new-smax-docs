import { notFound, redirect } from "next/navigation"
import { getDocTree, type DocTreeNode } from "@/lib/docs/service"

interface DocPageProps {
  params: Promise<{
    lang: "vi" | "en"
  }>
}

export const revalidate = 60 // Revalidate every 60 seconds (ISR)

export default async function DocsIndexPage({ params }: DocPageProps) {
  const { lang } = await params
  
  // Get the sorted document tree
  const tree = await getDocTree(lang)

  if (tree.length === 0) {
    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-4">
          {lang === 'vi' ? 'Tài liệu Smax AI' : 'Smax AI Documentation'}
        </h1>
        <p className="text-muted-foreground">
          {lang === 'vi' ? 'Chưa có tài liệu nào.' : 'No documentation available.'}
        </p>
      </div>
    )
  }

  // Find the first leaf node (actual document)
  let currentNode = tree[0]
  while (currentNode.children && currentNode.children.length > 0) {
    currentNode = currentNode.children[0]
  }

  // Redirect to the first document
  redirect(`/tai-lieu/${lang}/${currentNode.slug}`)
}