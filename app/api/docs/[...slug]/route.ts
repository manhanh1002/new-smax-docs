import { type NextRequest, NextResponse } from "next/server"
import { getDocPage, getAllDocPages } from "@/lib/docs/service"

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const slugPath = slug.join("/")
  const acceptHeader = request.headers.get("accept") || ""

  // Check if client wants markdown
  const wantsMarkdown = acceptHeader.includes("text/markdown")

  // Default to VI
  const page = await getDocPage(slugPath, "vi")

  if (!page) {
    if (wantsMarkdown) {
      return new NextResponse("# 404 - Not Found\n\nThe requested documentation page does not exist.", {
        status: 404,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
        },
      })
    }
    return NextResponse.json({ error: "Page not found" }, { status: 404 })
  }

  if (wantsMarkdown) {
    // Return full markdown document with frontmatter
    const markdown = `---
title: ${page.title}
description: ${page.description}
slug: ${page.slug}
---

# ${page.title}

${page.description}

${page.content}`

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    })
  }

  // Return JSON for non-markdown requests
  return NextResponse.json({
    slug: page.slug,
    title: page.title,
    description: page.description,
    content: page.content,
  })
}

// List all available docs
export async function OPTIONS() {
  const docPages = await getAllDocPages("vi")
  const pages = docPages.map((page) => ({
    slug: page.slug,
    title: page.title,
    description: page.description,
    url: `/api/docs/${page.slug}`,
  }))

  return NextResponse.json({
    message: "Use 'Accept: text/markdown' header to get markdown content",
    availablePages: pages,
  })
}