"use client"

import * as React from "react"
import { Link, Facebook, Mail, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { cn } from "@/lib/utils"

import { useLanguage } from "@/lib/context/language-context"
import { dictionaries } from "@/lib/i18n/dictionaries"

interface DocsShareProps {
  title: string
  slug?: string
  className?: string
}

export function DocsShare({ title, slug, className }: DocsShareProps) {
  const { copied, copy } = useCopyToClipboard()
  const [url, setUrl] = React.useState("")
  const { language } = useLanguage()
  const t = dictionaries[language]

  React.useEffect(() => {
    setUrl(window.location.href)
  }, [])

  const handleCopyLink = () => {
    copy(url)
  }

  const handleFacebookShare = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      "_blank",
      "width=600,height=400"
    )
  }

  const handleEmailShare = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`
  }

  return (
    <div className={cn("space-y-3 py-4", className)}>
      <h3 className="text-sm font-semibold text-foreground">{t.share.title}</h3>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2"
          onClick={handleCopyLink}
        >
          {copied ? <Check className="h-4 w-4" /> : <Link className="h-4 w-4" />}
          {t.share.copyLink}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
          onClick={handleFacebookShare}
          aria-label={t.share.facebook}
        >
          <Facebook className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-gray-300"
          onClick={handleEmailShare}
          aria-label={t.share.email}
        >
          <Mail className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
