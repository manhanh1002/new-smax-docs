import { type NextRequest, NextResponse } from "next/server"
import { getOutlineDocuments } from "@/lib/outline"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const collectionId = searchParams.get("collectionId") || process.env.OUTLINE_COLLECTION_VI_ID
  
  try {
    const documents = await getOutlineDocuments(collectionId!)
    
    if (documents.length === 0) {
      return NextResponse.json({ error: "No documents found" })
    }
    
    // Return first document for analysis
    const doc = documents[0]
    
    return NextResponse.json({
      id: doc.id,
      title: doc.title,
      urlId: doc.urlId,
      url: doc.url,
      // First 2000 chars of content
      textPreview: doc.text?.substring(0, 2000),
      textLength: doc.text?.length || 0,
      // Check for HTML tags
      hasHtmlTags: /<[a-zA-Z][^>]*>/.test(doc.text || ''),
      // Check for markdown patterns
      hasMarkdown: /^#|!\[.*\]\(.*\)|\[.*\]\(.*\)/m.test(doc.text || ''),
      // Sample image URLs
      imageUrls: (doc.text?.match(/!\[.*?\]\(.*?\)/g) || []).slice(0, 5),
      // Sample links
      links: (doc.text?.match(/\[.*?\]\(.*?\)/g) || []).slice(0, 5),
    })
  } catch (error) {
    console.error("Debug error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}