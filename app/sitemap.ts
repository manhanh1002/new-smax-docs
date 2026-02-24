import type { MetadataRoute } from "next"
import { getAllDocPages } from "@/lib/docs/service"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://docs.example.com"
  const langs = ["vi", "en"] as const

  const docRoutes: MetadataRoute.Sitemap = []

  for (const lang of langs) {
    const pages = await getAllDocPages(lang)
    for (const page of pages) {
      docRoutes.push({
        url: `${baseUrl}/tai-lieu/${lang}/${page.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })
    }
  }

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/tai-lieu`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...docRoutes,
  ]
}