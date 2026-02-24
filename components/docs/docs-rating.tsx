"use client"

import * as React from "react"
import { Frown, Meh, Smile, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { useLanguage } from "@/lib/context/language-context"
import { dictionaries } from "@/lib/i18n/dictionaries"

interface DocsRatingProps {
  slug?: string
}

interface RatingState {
  step: 1 | 2 | 3
  helpful?: "bad" | "normal" | "useful"
  easy?: "not_really" | "normal" | "easy"
}

export function DocsRating({ slug }: DocsRatingProps) {
  const [state, setState] = React.useState<RatingState>({ step: 1 })
  const { language } = useLanguage()
  const t = dictionaries[language]

  const handleHelpful = (value: "bad" | "normal" | "useful") => {
    setState((prev) => ({ ...prev, helpful: value, step: 2 }))
    // Here we would typically send partial data or wait for step 2
    console.log("Step 1 (Helpful):", value, "for slug:", slug)
  }

  const handleEasy = (value: "not_really" | "normal" | "easy") => {
    const finalState = { ...state, easy: value, step: 3 as const }
    setState(finalState)
    // Here we submit the full rating
    console.log("Step 2 (Easy):", value, "Full Rating:", finalState, "for slug:", slug)
    // TODO: Submit to Supabase
  }

  if (state.step === 3) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-500 py-4">
        <CheckCircle2 className="h-5 w-5 text-green-500" />
        <span className="text-sm font-medium">{t.rating.thankYou}</span>
      </div>
    )
  }

  return (
    <div className="space-y-3 py-4">
      <h3 className="text-sm font-semibold text-foreground">
        {state.step === 1 ? t.rating.helpfulQuestion : t.rating.easyQuestion}
      </h3>
      <div className="flex items-center gap-3">
        {state.step === 1 ? (
          <>
            <RatingButton
              icon={Frown}
              label={t.rating.bad}
              onClick={() => handleHelpful("bad")}
              className="hover:text-red-500 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30 dark:hover:border-red-900"
            />
            <RatingButton
              icon={Meh}
              label={t.rating.normal}
              onClick={() => handleHelpful("normal")}
              className="hover:text-yellow-500 hover:border-yellow-200 hover:bg-yellow-50 dark:hover:bg-yellow-950/30 dark:hover:border-yellow-900"
            />
            <RatingButton
              icon={Smile}
              label={t.rating.useful}
              onClick={() => handleHelpful("useful")}
              className="hover:text-green-500 hover:border-green-200 hover:bg-green-50 dark:hover:bg-green-950/30 dark:hover:border-green-900"
            />
          </>
        ) : (
          <>
            <RatingButton
              icon={Frown}
              label={t.rating.notReally}
              onClick={() => handleEasy("not_really")}
              className="hover:text-red-500 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30 dark:hover:border-red-900"
            />
            <RatingButton
              icon={Meh}
              label={t.rating.normal}
              onClick={() => handleEasy("normal")}
              className="hover:text-yellow-500 hover:border-yellow-200 hover:bg-yellow-50 dark:hover:bg-yellow-950/30 dark:hover:border-yellow-900"
            />
            <RatingButton
              icon={Smile}
              label={t.rating.easy}
              onClick={() => handleEasy("easy")}
              className="hover:text-green-500 hover:border-green-200 hover:bg-green-50 dark:hover:bg-green-950/30 dark:hover:border-green-900"
            />
          </>
        )}
      </div>
    </div>
  )
}

interface RatingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ElementType
  label: string
}

function RatingButton({ icon: Icon, label, className, ...props }: RatingButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("h-auto flex-col gap-1.5 py-2 px-3 min-w-[80px] transition-all", className)}
      {...props}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs">{label}</span>
    </Button>
  )
}
