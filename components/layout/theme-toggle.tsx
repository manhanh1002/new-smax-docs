"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Sun, Moon } from "lucide-react"

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div
        className="relative flex lg:h-7 h-[2.375rem] lg:w-[3.25rem] w-[4.5rem] items-center justify-between rounded-full p-1"
        style={{ border: "1px solid rgba(255, 255, 255, 0.07)" }}
        aria-label="Toggle dark mode"
      >
        <div className="flex lg:size-5 size-6 items-center justify-center">
          <Sun className="lg:size-3 size-3.5 text-zinc-400" />
        </div>
        <div className="flex lg:size-5 size-6 items-center justify-center">
          <Moon className="lg:size-3 size-3.5 text-zinc-400" />
        </div>
      </div>
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <button
      className="relative flex lg:h-7 h-[2.375rem] lg:w-[3.25rem] w-[4.5rem] items-center justify-between rounded-full p-1 transition-colors hover:opacity-80"
      style={{
        border: isDark ? "1px solid rgba(255, 255, 255, 0.07)" : "1px solid rgba(0, 0, 0, 0.15)",
      }}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle dark mode"
    >
      <div
        className={`flex lg:size-5 size-6 items-center justify-center rounded-full transition-colors ${!isDark ? "bg-zinc-300" : ""}`}
      >
        <Sun className={`lg:size-3 size-3.5 transition-colors ${!isDark ? "text-zinc-700" : "text-zinc-500"}`} />
      </div>
      <div
        className={`flex lg:size-5 size-6 items-center justify-center rounded-full transition-colors ${isDark ? "bg-zinc-700" : ""}`}
      >
        <Moon className={`lg:size-3 size-3.5 transition-colors ${isDark ? "text-zinc-300" : "text-zinc-400"}`} />
      </div>
    </button>
  )
}
