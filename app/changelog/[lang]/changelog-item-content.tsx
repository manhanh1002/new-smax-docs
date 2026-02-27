
'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChangelogItemContentProps {
  content: string
  lang: 'vi' | 'en'
}

export function ChangelogItemContent({ content, lang }: ChangelogItemContentProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Threshold for truncation (approximate characters)
  const TRUNCATE_LENGTH = 500
  const isLongContent = content.length > TRUNCATE_LENGTH

  // If expanded, show full content. If collapsed and long, show truncated
  // Note: Truncating markdown properly is hard, so we just limit height via CSS when collapsed
  
  return (
    <div className="relative">
      <div 
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          !isExpanded && isLongContent ? 'max-h-[300px] mask-linear-fade' : ''
        }`}
      >
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            img: ({node, ...props}) => (
              <span className="block my-4">
                <img 
                  {...props} 
                  className="rounded-lg border shadow-sm max-w-full h-auto mx-auto" 
                  alt={props.alt || 'Changelog image'}
                />
              </span>
            ),
            a: ({node, ...props}) => (
              <a {...props} className="text-primary hover:underline font-medium" target="_blank" rel="noopener noreferrer" />
            ),
            h1: ({node, ...props}) => <h3 {...props} className="text-xl font-bold mt-6 mb-3" />,
            h2: ({node, ...props}) => <h4 {...props} className="text-lg font-bold mt-5 mb-2" />,
            h3: ({node, ...props}) => <h5 {...props} className="text-base font-bold mt-4 mb-2" />,
            ul: ({node, ...props}) => <ul {...props} className="list-disc list-outside ml-5 mb-4 space-y-1" />,
            ol: ({node, ...props}) => <ol {...props} className="list-decimal list-outside ml-5 mb-4 space-y-1" />,
            p: ({node, ...props}) => <p {...props} className="mb-4 leading-relaxed" />,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      {isLongContent && (
        <div className={`mt-4 flex justify-center ${!isExpanded ? 'absolute bottom-0 left-0 right-0 pt-16 bg-gradient-to-t from-card to-transparent' : ''}`}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-4 py-2 text-sm font-medium text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {isExpanded 
              ? (lang === 'vi' ? 'Thu gọn' : 'Show less') 
              : (lang === 'vi' ? 'Xem thêm' : 'Read more')
            }
          </button>
        </div>
      )}
    </div>
  )
}
