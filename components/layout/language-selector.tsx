"use client"

import { useState } from "react"
import { Check, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import { useLanguage } from "@/lib/context/language-context"
import { useRouter, usePathname } from "next/navigation"

const languages = [
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "en", label: "English", flag: "🇺🇸" },
]

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const currentLang = languages.find((l) => l.code === language) || languages[0]

  const handleLanguageChange = (code: "vi" | "en") => {
    setLanguage(code)
    // Replace language segment in URL
    // Replace language segment in URL
    if (pathname.match(/\/(vi|en)/)) {
      const newPath = pathname.replace(/\/(vi|en)/, `/${code}`)
      router.push(newPath)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-9 gap-2 rounded-full border-border/50 bg-secondary/50 px-3 hover:bg-secondary"
        >
          <span className="text-base">{currentLang.flag}</span>
          <span className="text-sm">{currentLang.label}</span>
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code as "vi" | "en")}
            className="flex items-center gap-2 focus:text-accent-foreground"
          >
            <span className="text-base">{lang.flag}</span>
            <span className={language === lang.code ? "text-indigo-400 font-medium" : ""}>{lang.label}</span>
            {language === lang.code && <Check className="ml-auto h-4 w-4 text-indigo-400" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
