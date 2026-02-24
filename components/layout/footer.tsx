"use client"

import Link from "next/link"
import { Twitter, Linkedin, Github } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { siteConfig, footerLinks } from "@/lib/docs/nav"

export function Footer() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const borderColor = mounted
    ? resolvedTheme === "dark"
      ? "rgba(255, 255, 255, 0.07)"
      : "rgba(0, 0, 0, 0.3)"
    : "transparent"

  return (
    <footer className="border-t bg-background" style={{ borderColor }} role="contentinfo">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-6">
          {/* Logo */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600">
                <span className="text-sm font-bold text-white">D</span>
              </div>
              <span className="text-lg font-semibold text-foreground">{siteConfig.name}</span>
            </Link>

            {/* Social icons */}
            <div className="mt-6 flex items-center gap-4">
              <Link
                href={siteConfig.links.twitter}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Follow us on Twitter"
              >
                <Twitter className="size-5" />
              </Link>
              <Link
                href="#"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Connect on LinkedIn"
              >
                <Linkedin className="size-5" />
              </Link>
              <Link
                href={siteConfig.links.github}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="View source on GitHub"
              >
                <Github className="size-5" />
              </Link>
            </div>
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">Explore</h3>
            <ul className="mt-4 space-y-3" role="list">
              {footerLinks.explore.map((link) => (
                <li key={link.title}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">Resources</h3>
            <ul className="mt-4 space-y-3" role="list">
              {footerLinks.resources.map((link) => (
                <li key={link.title}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">Company</h3>
            <ul className="mt-4 space-y-3" role="list">
              {footerLinks.company.map((link) => (
                <li key={link.title}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">Legal</h3>
            <ul className="mt-4 space-y-3" role="list">
              {footerLinks.legal.map((link) => (
                <li key={link.title}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}
