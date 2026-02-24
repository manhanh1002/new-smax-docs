// lib/docs/nav.ts
// Navigation configuration - now fetches from Outline API

import type React from "react"
import { Rocket, Settings, Palette, PenTool } from "lucide-react"

export const siteConfig = {
  name: "Docs",
  description: "AI-native documentation platform for developers and teams",
  url: "https://docs.cdp.vn",
  links: {
    twitter: "https://twitter.com/docs",
    github: "https://github.com/docs",
  },
}

export const topNavigation = [
  { title: "Documentation", href: "/tai-lieu/vi" },
  { title: "Guides", href: "/tai-lieu/vi/quickstart" },
  { title: "API reference", href: "/tai-lieu/vi/api" },
  { title: "Changelog", href: "/tai-lieu/vi/changelog" },
]

export const footerLinks = {
  explore: [
    { title: "Startups", href: "#" },
    { title: "Enterprise", href: "#" },
    { title: "Switch", href: "#" },
  ],
  resources: [
    { title: "Customers", href: "#" },
    { title: "Blog", href: "#" },
    { title: "Pricing", href: "#" },
    { title: "Contact support", href: "#" },
    { title: "Feature Requests", href: "#" },
    { title: "Status", href: "#" },
  ],
  company: [
    { title: "Careers", href: "#" },
    { title: "Wall of Love", href: "#" },
  ],
  legal: [
    { title: "Privacy Policy", href: "#" },
    { title: "Terms of Service", href: "#" },
    { title: "Security", href: "#" },
  ],
}

export interface NavItem {
  title: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
  items?: NavItem[]
  collapsible?: boolean
}

export interface NavSection {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  items: NavItem[]
}

// Default navigation - will be replaced by Outline data
// This is only used as fallback when Outline is not available
export const navigation: NavSection[] = [
  {
    title: "Documentation",
    icon: Rocket,
    items: [
      { title: "Introduction", href: "/tai-lieu/vi" },
    ],
  },
]