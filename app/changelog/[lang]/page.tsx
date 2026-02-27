
import { getChangelogs } from '@/lib/changelog/service'
import { Metadata } from 'next'
import Link from 'next/link'
import { ChangelogItemContent } from './changelog-item-content'

interface ChangelogPageProps {
  params: Promise<{
    lang: "vi" | "en"
  }>
}

export async function generateMetadata({ params }: ChangelogPageProps): Promise<Metadata> {
  const { lang } = await params
  return {
    title: lang === 'vi' ? 'Cập nhật - Smax AI' : 'Changelog - Smax AI',
    description: lang === 'vi' 
      ? 'Theo dõi các bản cập nhật mới nhất từ Smax AI' 
      : 'Stay updated with the latest changes from Smax AI',
  }
}

export default async function ChangelogPage({ params }: ChangelogPageProps) {
  const { lang } = await params
  const changelogs = await getChangelogs(lang)

  return (
    <div className="container py-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-primary">
          {lang === 'vi' ? 'Cập nhật' : 'Changelog'}
        </h1>
        <p className="text-xl text-muted-foreground">
          {lang === 'vi' 
            ? 'Những tính năng mới và cải tiến từ đội ngũ Smax AI' 
            : 'New features and improvements from the Smax AI team'}
        </p>
      </div>

      {/* Timeline Layout */}
      <div className="relative border-l border-muted-foreground/20 ml-4 md:ml-6 space-y-12">
        {changelogs.length > 0 ? (
          changelogs.map((item, index) => (
            <div key={item.id} className="relative pl-8 md:pl-12">
              {/* Timeline Dot */}
              <div className="absolute -left-1.5 top-1.5 w-3 h-3 bg-primary rounded-full ring-4 ring-background" />
              
              {/* Date */}
              <div className="mb-2 text-sm text-muted-foreground font-medium">
                {new Date(item.publishedAt).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>

              {/* Content Card */}
              <div className="bg-card border rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <h2 className="text-2xl font-bold mb-4 text-foreground">
                    {item.title}
                  </h2>
                  
                  {/* Reuse DocContent for Markdown rendering but without header */}
                  <div className="prose dark:prose-invert max-w-none">
                    {/* We render content directly here or use a specialized component */}
                    {/* Since DocContent includes a header, we might want to extract the markdown renderer */}
                    {/* For now, let's use a simple div with prose class and dangerouslySetInnerHTML if content is HTML */}
                    {/* Or better, let's assume content is Markdown and we need a renderer. */}
                    {/* Since we don't have a standalone Markdown component exposed, we'll use a simplified approach for now */}
                    
                    {/* Check if content is long to show "Read more" - implemented via CSS/State in a client component? */}
                    {/* For server component, we just render full content or truncate */}
                    <ChangelogItemContent content={item.content} lang={lang} />
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="pl-8 text-muted-foreground italic">
            {lang === 'vi' ? 'Chưa có bản cập nhật nào.' : 'No updates available yet.'}
          </div>
        )}
      </div>
    </div>
  )
}
