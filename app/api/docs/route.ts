import { type NextRequest, NextResponse } from "next/server"
import { getAllDocPages } from "@/lib/docs/service"

export async function GET(request: NextRequest) {
  const acceptHeader = request.headers.get("accept") || ""
  const wantsMarkdown = acceptHeader.includes("text/markdown")
  // Default to VI for now, or we could parse lang from query param
  const docPages = await getAllDocPages("vi") 

  if (wantsMarkdown) {
    // Return a markdown index of all docs
    const markdown = `---
title: Documentation Index
description: All available documentation pages
---

# Documentation

Welcome to our documentation. Below is a list of all available pages.

## Available Pages

${docPages.map((page) => `- [${page.title}](/api/docs/${page.slug}) - ${page.description}`).join("\n")}

---

**Tip:** Use \`curl -H 'Accept: text/markdown'\` to fetch any page as markdown.

\`\`\`bash
curl -H 'Accept: text/markdown' ${process.env.NEXT_PUBLIC_SITE_URL || "https://your-docs.com"}/api/docs/quickstart
\`\`\`
`

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    })
  }

  // Return JSON index
  return NextResponse.json({
    message: "Documentation API - Use 'Accept: text/markdown' header for markdown responses",
    usage: {
      listAll: "GET /api/docs",
      getPage: "GET /api/docs/{slug}",
      markdownFormat: "Add header 'Accept: text/markdown'",
    },
    pages: docPages.map((page) => ({
      slug: page.slug,
      title: page.title,
      description: page.description,
      url: `/api/docs/${page.slug}`,
    })),
  })
}
