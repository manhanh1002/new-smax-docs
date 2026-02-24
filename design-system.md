# SmaxAi — Design System
**Next.js 14 App Router · Tailwind CSS v3 · TypeScript**

> Single source of truth cho toàn bộ UI: Docs Site (SmaxAi) + Livechat App (VIK Group).
> Được trích xuất từ `design-analysis.json` và phân tích giao diện thực tế.

---

## Mục lục

1. [Cài đặt](#1-cài-đặt)
2. [Design Tokens — `tailwind.config.ts`](#2-design-tokens--tailwindconfigts)
3. [Global CSS — `globals.css`](#3-global-css--globalscss)
4. [Layout System](#4-layout-system)
5. [Components](#5-components)
   - [TopNav](#51-topnav)
   - [Sidebar](#52-sidebar)
   - [Search Bar](#53-search-bar)
   - [Breadcrumb](#54-breadcrumb)
   - [Page Header](#55-page-header)
   - [Table of Contents (TOC)](#56-table-of-contents-toc)
   - [Button](#57-button)
   - [Input Field](#58-input-field)
   - [Badge & Tag](#59-badge--tag)
   - [Avatar](#510-avatar)
   - [Callout / Alert](#511-callout--alert)
   - [Floating Action Button](#512-floating-action-button)
   - [Theme & Language Toggle](#513-theme--language-toggle)
6. [Typography Prose (MDX Content)](#6-typography-prose-mdx-content)
7. [Dark Mode](#7-dark-mode)
8. [Responsive Behavior](#8-responsive-behavior)

---

## 1. Cài đặt

```bash
npm install -D tailwindcss @tailwindcss/typography
npm install next-themes
```

Cấu trúc thư mục:

```
├── tailwind.config.ts
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── docs/[...slug]/page.tsx
└── components/
    ├── layout/
    │   ├── TopNav.tsx
    │   ├── Sidebar.tsx
    │   ├── DocsShell.tsx
    │   └── TableOfContents.tsx
    ├── docs/
    │   ├── Breadcrumb.tsx
    │   ├── PageHeader.tsx
    │   ├── Callout.tsx
    │   └── DocsProse.tsx
    └── ui/
        ├── Button.tsx
        ├── Input.tsx
        ├── Badge.tsx
        ├── Avatar.tsx
        └── SearchBar.tsx
```

---

## 2. Design Tokens — `tailwind.config.ts`

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./content/**/*.{md,mdx}",
  ],

  theme: {
    extend: {

      // ════════════════════════════════════════════════════
      // COLORS
      // Nguồn: design-analysis.json + screenshot SmaxAi Docs
      // ════════════════════════════════════════════════════
      colors: {

        // ── Brand accent (SmaxAi — từ screenshot) ─────────
        // Màu cam/coral — active nav, link, badge outline
        brand: {
          50:      "#fff7ed",
          100:     "#ffedd5",
          200:     "#fed7aa",
          DEFAULT: "#f97316",   // SmaxAi badge border
          600:     "#ea580c",   // active nav text
          700:     "#c2410c",
        },

        // ── Coral accent (từ JSON #fa6e5b, count:8) ───────
        // Livechat: notification badge, error, highlight
        coral: {
          DEFAULT: "#fa6e5b",   // text + border
          light:   "#fde8e5",
          dark:    "#e85c49",
        },

        // ── Navy (từ JSON #0f1835, count:1321 — màu chủ đạo)
        // Livechat sidebar bg, text chính, borders
        navy: {
          DEFAULT: "#0f1835",   // primary
          medium:  "#2b3552",   // count:5 — border
          light:   "#3d4a6b",
        },

        // ── Neutrals (chuẩn hóa từ JSON hex values) ───────
        neutral: {
          0:   "#ffffff",
          50:  "#f8f9fa",   // JSON #f8f9fa count:56 — bg livechat
          100: "#f4f6fa",   // JSON #f4f6fa count:18 — bg card
          200: "#e8ecf2",   // JSON #e8ecf2 count:14 — border
          300: "#cccccc",   // JSON #cccccc count:12 — border
          400: "#999999",   // JSON #999999 count:9  — muted
          500: "#afb2bd",   // JSON #afb2bd count:60 — text secondary
          600: "#5d6272",   // JSON #5d6272 count:56 — text muted
          700: "#555555",   // JSON #555555 count:18 — body
          800: "#333333",   // JSON #333333 count:25 — dark text
          900: "#0f1835",   // JSON #0f1835 — darkest / navy
        },

        // ── Surface ────────────────────────────────────────
        surface: {
          page:   "#f8f9fa",   // trang background
          base:   "#ffffff",   // topnav, sidebar, card
          subtle: "#f4f6fa",   // hover, code bg
          border: "#e8ecf2",   // border chung
        },
      },

      // ════════════════════════════════════════════════════
      // TYPOGRAPHY
      // Font: DM Sans (thay Roboto/Arial từ JSON)
      // Sora cho display headings
      // ════════════════════════════════════════════════════
      fontFamily: {
        sans:    ["var(--font-sans)", "DM Sans", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Sora", "system-ui", "sans-serif"],
        mono:    ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },

      fontSize: {
        // Section labels (GET STARTED, ORGANIZE…)
        "2xs": ["0.625rem",   { lineHeight: "0.875rem", letterSpacing: "0.08em" }],
        xs:    ["0.75rem",    { lineHeight: "1.125rem" }],
        sm:    ["0.8125rem",  { lineHeight: "1.25rem" }],
        // JSON: 14px/400/21px — body chuẩn
        base:  ["0.875rem",   { lineHeight: "1.5rem" }],
        md:    ["0.9375rem",  { lineHeight: "1.625rem" }],
        // JSON: 16px/400/24px — chat row name
        lg:    ["1rem",       { lineHeight: "1.625rem" }],
        xl:    ["1.125rem",   { lineHeight: "1.75rem" }],
        "2xl": ["1.25rem",    { lineHeight: "1.875rem" }],
        "3xl": ["1.5rem",     { lineHeight: "2rem" }],
        // Page title từ screenshot ~30px bold
        "4xl": ["1.875rem",   { lineHeight: "2.25rem" }],
        "5xl": ["2.25rem",    { lineHeight: "2.5rem" }],
      },

      // ════════════════════════════════════════════════════
      // SPACING
      // Base unit: 3.5px từ JSON → nhân bội 2 → 7px → 14px
      // ════════════════════════════════════════════════════
      spacing: {
        // Micro units từ JSON
        "3.5":      "3.5px",    // JSON padding:3.5px  count:8
        "3.75":     "3.75px",
        // Standard từ JSON
        "1":        "4px",      // JSON padding:4px    count:6
        "2":        "7px",      // JSON padding:7px    count:7
        "3":        "10.5px",   // JSON padding:10.5px count:23
        "4":        "14px",     // JSON margin:14px    count:23
        "5":        "16px",     // JSON padding:16px   count:23
        "6":        "24px",     // JSON padding:24px   count:4
        // Layout macros
        "topnav-h": "56px",
        "sidebar-w":"260px",
        "toc-w":    "220px",
      },

      width:     { sidebar: "260px", toc: "220px" },
      maxWidth:  { content: "780px", prose: "68ch" },
      height:    { topnav: "56px" },

      // ════════════════════════════════════════════════════
      // BORDER RADIUS
      // ════════════════════════════════════════════════════
      borderRadius: {
        none: "0px",
        xs:   "3px",
        sm:   "4px",
        md:   "6px",
        lg:   "8px",
        xl:   "10px",
        "2xl":"12px",
        "3xl":"16px",
        full: "9999px",
      },

      // ════════════════════════════════════════════════════
      // SHADOWS
      // Base: navy #0f1835 thay vì black
      // ════════════════════════════════════════════════════
      boxShadow: {
        xs:           "0 1px 2px 0 rgb(15 24 53 / 0.04)",
        sm:           "0 1px 3px 0 rgb(15 24 53 / 0.06), 0 1px 2px -1px rgb(15 24 53 / 0.04)",
        md:           "0 4px 6px -1px rgb(15 24 53 / 0.06), 0 2px 4px -2px rgb(15 24 53 / 0.04)",
        lg:           "0 10px 15px -3px rgb(15 24 53 / 0.08), 0 4px 6px -4px rgb(15 24 53 / 0.04)",
        focus:        "0 0 0 3px rgb(249 115 22 / 0.20)",
        "focus-coral":"0 0 0 3px rgb(250 110 91 / 0.20)",
        fab:          "0 8px 24px rgb(15 24 53 / 0.16), 0 2px 8px rgb(15 24 53 / 0.10)",
        modal:        "0 20px 48px rgb(15 24 53 / 0.20)",
      },

      // ════════════════════════════════════════════════════
      // ANIMATIONS
      // Từ JSON: translateY(-10.5px) slide pattern
      // ════════════════════════════════════════════════════
      keyframes: {
        "slide-down": {
          "0%":   { opacity: "0", transform: "translateY(-10.5px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "slide-down": "slide-down 0.2s cubic-bezier(0.4,0,0.2,1)",
        "slide-up":   "slide-up 0.2s cubic-bezier(0.4,0,0.2,1)",
        "fade-in":    "fade-in 0.2s ease-out",
      },

      zIndex: {
        sidebar: "40",
        topnav:  "50",
        overlay: "60",
        modal:   "70",
        toast:   "80",
      },
    },
  },

  plugins: [require("@tailwindcss/typography")],
};

export default config;
```

---

## 3. Global CSS — `globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/*
  app/layout.tsx — Font loading:
  import { DM_Sans, Sora, JetBrains_Mono } from "next/font/google";
  const sans    = DM_Sans({ subsets:["latin","vietnamese"], variable:"--font-sans", weight:["400","500","600","700"] });
  const display = Sora({ subsets:["latin","vietnamese"], variable:"--font-display", weight:["600","700","800"] });
  const mono    = JetBrains_Mono({ subsets:["latin"], variable:"--font-mono", weight:["400","500"] });
*/

@layer base {
  :root {
    --topnav-h:    56px;
    --sidebar-w:   260px;
    --toc-w:       220px;
    --content-max: 780px;
    /* Brand gradient — từ JSON: 156deg, #ff7265 → #7ac3ff */
    --gradient-brand: linear-gradient(156deg, #ff7265 0%, #7ac3ff 100%);
  }

  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    scroll-behavior: smooth;
  }

  body { @apply bg-surface-page text-neutral-800 font-sans text-base; }

  /* Scrollbar */
  ::-webkit-scrollbar       { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { @apply bg-neutral-200 rounded-full; }
  ::-webkit-scrollbar-thumb:hover { @apply bg-neutral-300; }

  /* Selection */
  ::selection { background: rgb(249 115 22 / 0.15); color: #c2410c; }

  /* Focus */
  :focus-visible { @apply outline-none ring-2 ring-brand/40 ring-offset-1; }
}

@layer components {

  /* ── Layout shell ────────────────────────────────────────── */
  .docs-shell      { @apply flex min-h-screen pt-[var(--topnav-h)]; }

  .docs-sidebar    {
    @apply fixed inset-y-0 left-0 w-[var(--sidebar-w)]
           bg-surface-base border-r border-surface-border
           overflow-y-auto pt-[var(--topnav-h)] z-[40];
  }

  .docs-main       { @apply flex-1 ml-[var(--sidebar-w)] xl:mr-[var(--toc-w)]; }
  .docs-main-inner { @apply mx-auto max-w-[var(--content-max)] px-8 py-10; }

  .docs-toc        {
    @apply fixed inset-y-0 right-0 w-[var(--toc-w)]
           hidden xl:block overflow-y-auto
           pt-[calc(var(--topnav-h)+2rem)] px-4 z-[30];
  }

  /* ── TopNav ──────────────────────────────────────────────── */
  .topnav {
    @apply fixed inset-x-0 top-0 h-[var(--topnav-h)]
           flex items-center gap-4 px-4
           bg-surface-base border-b border-surface-border z-[50];
  }

  /* ── Sidebar nav ─────────────────────────────────────────── */
  .sidebar-label {
    @apply flex items-center gap-1.5 px-3 pt-5 pb-1.5
           text-2xs font-semibold uppercase tracking-widest text-neutral-400;
  }

  .nav-item {
    @apply flex items-center justify-between w-full px-3 py-[7px]
           rounded-md text-sm text-neutral-600
           hover:text-neutral-900 hover:bg-surface-subtle
           transition-colors duration-150 cursor-pointer;
  }
  .nav-item--active  { @apply text-brand-600 font-medium bg-brand-50 hover:text-brand-600 hover:bg-brand-50; }
  .nav-item--child   { @apply ml-3 text-neutral-500; }
  .nav-item--parent  { @apply font-medium text-neutral-800; }

  .sidebar-divider   { @apply h-px bg-surface-border mx-3 my-2; }

  /* ── Search ──────────────────────────────────────────────── */
  .search-input {
    @apply w-full h-9 pl-9 pr-16
           bg-surface-subtle border border-surface-border rounded-md
           text-sm text-neutral-800 placeholder:text-neutral-400
           outline-none transition-all duration-150
           hover:border-neutral-300
           focus:bg-white focus:border-brand/50 focus:shadow-focus;
  }

  /* ── Breadcrumb ──────────────────────────────────────────── */
  .breadcrumb       { @apply flex items-center gap-1.5 text-sm text-neutral-400 mb-6; }
  .breadcrumb-item  { @apply hover:text-neutral-700 transition-colors duration-150; }
  .breadcrumb-sep   { @apply text-neutral-300 text-xs select-none; }

  /* ── Page header ─────────────────────────────────────────── */
  .page-title       { @apply text-4xl font-bold text-neutral-900 font-display tracking-tight; }
  .page-description { @apply text-md text-neutral-600 leading-relaxed mt-2; }

  /* ── Copy button (Sao chép trang) ───────────────────────── */
  .copy-btn {
    @apply inline-flex items-center gap-1.5 px-3 py-1.5 flex-shrink-0
           text-sm text-neutral-600 bg-white border border-neutral-200 rounded-lg
           hover:bg-surface-subtle hover:border-neutral-300 hover:text-neutral-900
           transition-all duration-150 cursor-pointer;
  }

  /* ── TOC ─────────────────────────────────────────────────── */
  .toc-title        { @apply text-xs font-semibold text-neutral-900 mb-3 uppercase tracking-widest; }
  .toc-item         { @apply block text-sm text-neutral-400 py-0.5 hover:text-neutral-900 transition-colors duration-150; }
  .toc-item--h2     { @apply text-neutral-600; }
  .toc-item--h3     { @apply pl-3 text-xs; }
  .toc-item--active { @apply text-brand-600 font-medium; }

  /* ── Avatar ──────────────────────────────────────────────── */
  .avatar {
    @apply inline-flex items-center justify-center
           rounded-full overflow-hidden flex-shrink-0
           bg-navy text-white font-semibold;
  }
  .avatar--xs       { @apply w-6 h-6 text-[10px]; }
  .avatar--sm       { @apply w-8 h-8 text-xs; }
  .avatar--md       { @apply w-10 h-10 text-sm; }
  .avatar--lg       { @apply w-12 h-12 text-base; }
  .avatar--gradient { background: var(--gradient-brand); }
  /* Từ JSON: grayscale(0.3) + opacity:0.75 cho inactive state */
  .avatar--muted    { @apply grayscale-[30%] opacity-75; }

  /* ── Badge (từ JSON #fa6e5b) ─────────────────────────────── */
  .badge {
    @apply inline-flex items-center justify-center
           min-w-[18px] h-[18px] px-1
           bg-coral text-white rounded-full
           text-[11px] font-semibold leading-none;
  }
  .badge--dot       { @apply w-2 h-2 min-w-0 p-0; }

  /* ── Tag / chip ──────────────────────────────────────────── */
  .tag              { @apply inline-flex items-center h-[22px] px-2 rounded text-xs font-medium; }
  .tag--default     { @apply bg-surface-subtle text-neutral-600 border border-surface-border; }
  .tag--active      { @apply bg-coral/10 text-coral border border-coral/25; }
  .tag--brand       { @apply bg-brand-50 text-brand-600 border border-brand-200; }

  /* ── Callout ─────────────────────────────────────────────── */
  .callout          { @apply flex gap-3 p-4 rounded-xl border my-4 text-sm; }
  .callout-info     { @apply bg-blue-50 border-blue-200 text-blue-900; }
  .callout-tip      { @apply bg-brand-50 border-brand-200 text-amber-900; }
  .callout-warn     { @apply bg-amber-50 border-amber-200 text-amber-900; }
  .callout-danger   { @apply bg-red-50 border-red-200 text-red-900; }

  /* ── FAB (bottom right ✦) ────────────────────────────────── */
  .fab {
    @apply fixed bottom-6 right-6 w-12 h-12 rounded-full
           bg-navy text-white flex items-center justify-center
           shadow-fab cursor-pointer
           hover:scale-105 transition-transform duration-200;
    z-index: 80;
  }

  /* ── Theme toggle ────────────────────────────────────────── */
  .theme-toggle       { @apply flex items-center bg-surface-subtle rounded-full p-0.5 gap-0.5; }
  .theme-toggle-btn   { @apply w-7 h-7 rounded-full flex items-center justify-center text-sm text-neutral-500 transition-all duration-200 cursor-pointer; }
  .theme-toggle-btn--active { @apply bg-white text-neutral-900 shadow-xs; }

  /* ── Language toggle ─────────────────────────────────────── */
  .lang-toggle { @apply flex items-center gap-1.5 px-3 py-2 text-sm text-neutral-600 rounded-lg hover:bg-surface-subtle transition-colors cursor-pointer; }
}

@layer utilities {
  .text-balance  { text-wrap: balance; }
  .scrollbar-none { scrollbar-width: none; -ms-overflow-style: none; }
  .scrollbar-none::-webkit-scrollbar { display: none; }
  .text-gradient-brand {
    background: var(--gradient-brand);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}
```

---

## 4. Layout System

### Cấu trúc 3 cột

```
┌──────────────────────────────────────────────────────────────────┐
│  TopNav — fixed, h-[56px], z-[50]                                │
│  [S Docs]  [🔍 Tìm kiếm tài liệu… ⌘K]  [Nav links]  [SmaxAi]  │
├─────────────┬────────────────────────────┬───────────────────────┤
│  Sidebar    │  Content                   │  TOC (xl+)            │
│  w-[260px]  │  ml-[260px] xl:mr-[220px] │  w-[220px]            │
│  fixed      │  max-w-[780px] px-8 py-10  │  fixed right          │
│  pt-[56px]  │                            │  pt-[88px]            │
│             │  [Breadcrumb]              │                       │
│  🚀 GET     │  [H1 + description]        │  Trên trang này       │
│  STARTED    │  [copy-btn]                │  ─ Thành phần chính   │
│  Intro      │                            │    Vector Database    │
│  Quickstart │  [H2 content]              │    LLM Gateway        │
│  AI-native⌄ │  [Body text…]              │    Ingestion Pipeline │
│    Concept  │  [H3 sub-sections]         │                       │
│  ■ Architec │                            │                       │
│  Migration  │                            │                       │
│  ───────── │                            │                       │
│  ⚙ ORGANIZE │                            │                       │
│  …          │                            │                       │
│  ───────── │                            │                       │
│  🎨 CUSTOM  │                            │                       │
│  …          │                            │                       │
│  ─────────  │                            │                       │
│ 🇻🇳 VI ∧   │                            │                       │
│ ☀ ☽        │                            │                       │
└─────────────┴────────────────────────────┴──────────── [✦ FAB]──┘
```

### `DocsShell.tsx`

```tsx
// components/layout/DocsShell.tsx
export function DocsShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="docs-shell">
      <aside className="docs-sidebar scrollbar-none">
        <SidebarNav />
        <SidebarFooter />
      </aside>

      <main className="docs-main">
        <div className="docs-main-inner">{children}</div>
      </main>

      <aside className="docs-toc scrollbar-none">
        <TableOfContents />
      </aside>
    </div>
  );
}
```

### `app/layout.tsx` — Font loading

```tsx
import { DM_Sans, Sora, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";

const sans    = DM_Sans({ subsets: ["latin","vietnamese"], variable: "--font-sans",    weight: ["400","500","600","700"] });
const display = Sora({    subsets: ["latin","vietnamese"], variable: "--font-display", weight: ["600","700","800"] });
const mono    = JetBrains_Mono({ subsets: ["latin"],      variable: "--font-mono",    weight: ["400","500"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${sans.variable} ${display.variable} ${mono.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="light">
          <TopNav />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

## 5. Components

### 5.1 TopNav

**Specs:**

| Property | Value | Class |
|---|---|---|
| Height | 56px | `h-[var(--topnav-h)]` |
| Background | white | `bg-surface-base` |
| Border bottom | 1px `#e8ecf2` | `border-b border-surface-border` |
| Z-index | 50 | `z-[50]` |
| Logo font | Sora, 18px/600 | `font-display font-semibold text-lg` |
| Logo icon | Navy `#0f1835`, 32px, rounded-lg | `bg-navy w-8 h-8 rounded-lg` |
| Nav link default | 13px/500, `#5d6272` | `text-sm font-medium text-neutral-600` |
| Nav link active | `#0f1835` | `text-neutral-900` |
| SmaxAi badge | outline `brand`, rounded-full | `border border-brand text-brand-600 bg-brand-50` |

```tsx
// components/layout/TopNav.tsx
export function TopNav() {
  return (
    <header className="topnav">
      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center
                        text-white text-sm font-bold font-display">
          S
        </div>
        <span className="font-semibold text-lg font-display text-neutral-900">Docs</span>
      </div>

      {/* Search — center */}
      <div className="flex-1 max-w-lg mx-4">
        <SearchBar placeholder="Tìm kiếm tài liệu..." />
      </div>

      {/* Nav links */}
      <nav className="hidden md:flex items-center gap-0.5">
        {["Documentation","Guides","API reference","Changelog"].map((l) => (
          <a key={l} className="px-3 py-1.5 text-sm font-medium text-neutral-600 rounded-md
                                hover:text-neutral-900 hover:bg-surface-subtle
                                transition-colors duration-150 cursor-pointer">
            {l}
          </a>
        ))}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
        <span className="px-3 py-1 text-sm font-semibold rounded-full border
                         border-brand text-brand-600 bg-brand-50 cursor-pointer
                         hover:bg-brand-100 transition-colors">
          SmaxAi
        </span>
        <button className="w-8 h-8 flex items-center justify-center rounded-md
                           text-neutral-400 hover:bg-surface-subtle transition-colors">
          {/* Bell icon */}
        </button>
        <div className="avatar avatar--sm">M</div>
      </div>
    </header>
  );
}
```

---

### 5.2 Sidebar

**Nav item states:**

| State | Background | Text | Left border |
|---|---|---|---|
| Default | transparent | `#5d6272` | none |
| Hover | `#f4f6fa` | `#0f1835` | none |
| Active | `#fff7ed` | `#ea580c` | none |
| Child active | `#fff7ed` | `#ea580c` | none |

```tsx
// components/layout/Sidebar.tsx
type NavItem    = { label: string; href?: string; icon?: string; active?: boolean; children?: NavItem[]; hasChevron?: boolean };
type NavSection = { icon: string; label: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    icon: "🚀", label: "GET STARTED",
    items: [
      { label: "Introduction" },
      { label: "Quickstart" },
      {
        label: "AI-native", hasChevron: true,
        children: [
          { label: "Concept" },
          { label: "Architecture", active: true },
        ],
      },
      { label: "Migration guide" },
    ],
  },
  {
    icon: "⚙", label: "ORGANIZE",
    items: [
      { label: "Global settings", icon: "⚙" },
      { label: "Navigation",      icon: "✈", hasChevron: true },
      { label: "Pages",           icon: "📄" },
      { label: "Hidden pages",    icon: "🚫" },
      { label: "Exclude files",   icon: "📦" },
    ],
  },
  {
    icon: "🎨", label: "CUSTOMIZE",
    items: [{ label: "Custom domain", icon: "🌐" }],
  },
];

export function SidebarNav() {
  return (
    <div className="flex flex-col h-full">
      <nav className="flex-1 py-2 px-2">
        {NAV.map((section, si) => (
          <div key={si}>
            <div className="sidebar-label">
              <span>{section.icon}</span>
              <span>{section.label}</span>
            </div>

            {section.items.map((item, ii) => (
              <div key={ii}>
                <a className={`nav-item ${item.children ? "nav-item--parent" : ""} ${item.active ? "nav-item--active" : ""}`}>
                  <div className="flex items-center gap-2">
                    {item.icon && <span className="opacity-50 text-xs">{item.icon}</span>}
                    <span>{item.label}</span>
                  </div>
                  {item.hasChevron && (
                    <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </a>

                {item.children?.map((child, ci) => (
                  <a key={ci} className={`nav-item nav-item--child ${child.active ? "nav-item--active" : ""}`}>
                    {child.label}
                  </a>
                ))}
              </div>
            ))}

            {si < NAV.length - 1 && <div className="sidebar-divider" />}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-3 pt-2 border-t border-surface-border space-y-1">
        <div className="lang-toggle">
          <span>🇻🇳</span>
          <span>Tiếng Việt</span>
          <svg className="w-4 h-4 ml-auto rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <div className="theme-toggle">
          <button className="theme-toggle-btn theme-toggle-btn--active">☀</button>
          <button className="theme-toggle-btn">☽</button>
        </div>
      </div>
    </div>
  );
}
```

---

### 5.3 Search Bar

```tsx
// components/ui/SearchBar.tsx
export function SearchBar({ placeholder = "Tìm kiếm..." }: { placeholder?: string }) {
  return (
    <div className="relative flex items-center">
      <svg className="absolute left-3 w-4 h-4 text-neutral-400 pointer-events-none z-10"
           fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>

      <input type="text" placeholder={placeholder} className="search-input" />

      <div className="absolute right-3 flex items-center gap-0.5 pointer-events-none select-none">
        <kbd className="inline-flex items-center px-1 h-5 rounded border border-neutral-200
                        bg-white text-[10px] text-neutral-500 font-mono">⌘</kbd>
        <kbd className="inline-flex items-center px-1 h-5 rounded border border-neutral-200
                        bg-white text-[10px] text-neutral-500 font-mono">K</kbd>
      </div>
    </div>
  );
}
```

**States:**

| State | Background | Border | Shadow |
|---|---|---|---|
| Default | `#f4f6fa` | `#e8ecf2` | none |
| Hover | `#f4f6fa` | `#cccccc` | none |
| Focus | white | `brand/50` | `shadow-focus` (orange glow) |

---

### 5.4 Breadcrumb

```tsx
// components/docs/Breadcrumb.tsx
type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="breadcrumb">
      <span className="breadcrumb-item">🏠</span>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="breadcrumb-sep">›</span>
          {item.href
            ? <a href={item.href} className="breadcrumb-item">{item.label}</a>
            : <span className="text-neutral-600">{item.label}</span>
          }
        </div>
      ))}
    </nav>
  );
}

// Usage:
// <Breadcrumb items={[{ label: "Kiến trúc hệ thống" }]} />
```

---

### 5.5 Page Header

```tsx
// components/docs/PageHeader.tsx
export function PageHeader({
  title, description, onCopy,
}: { title: string; description?: string; onCopy?: () => void }) {
  return (
    <div className="mb-8 pb-6 border-b border-surface-border">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{title}</h1>
          {description && <p className="page-description">{description}</p>}
        </div>
        {onCopy && (
          <button onClick={onCopy} className="copy-btn mt-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Sao chép trang
          </button>
        )}
      </div>
    </div>
  );
}
```

**Typography specs:**

| Property | Value | Class |
|---|---|---|
| Font family | Sora display | `font-display` |
| Font size | 30px | `text-4xl` |
| Font weight | 700 | `font-bold` |
| Color | `#0f1835` navy | `text-neutral-900` |
| Tracking | tight | `tracking-tight` |
| Description size | 15px | `text-md` |
| Description color | `#5d6272` | `text-neutral-600` |

---

### 5.6 Table of Contents (TOC)

```tsx
// components/layout/TableOfContents.tsx
type TocItem = { id: string; label: string; level: 2 | 3 };

export function TableOfContents({ items }: { items: TocItem[] }) {
  return (
    <div>
      <p className="toc-title">Trên trang này</p>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`}
               className={`toc-item toc-item--h${item.level}`}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Ví dụ data từ screenshot:
const TOC: TocItem[] = [
  { id: "thanh-phan-chinh",   label: "Thành phần chính", level: 2 },
  { id: "vector-database",    label: "Vector Database",   level: 3 },
  { id: "llm-gateway",        label: "LLM Gateway",       level: 3 },
  { id: "ingestion-pipeline", label: "Ingestion Pipeline",level: 3 },
];
```

**Item specs:**

| Type | Size/Weight | Color | Indent |
|---|---|---|---|
| Title "Trên trang này" | 12px / 600 / uppercase | `#0f1835` | — |
| H2 link | 14px / 400 | `#5d6272` | — |
| H3 link | 12px / 400 | `#999999` | `pl-3` |
| Active | 14px / 500 | `#ea580c` | — |

---

### 5.7 Button

```tsx
// components/ui/Button.tsx
type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size    = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:   "bg-coral text-white hover:bg-coral-dark shadow-xs",
  secondary: "bg-white text-neutral-700 border border-neutral-200 hover:bg-surface-subtle hover:border-neutral-300",
  ghost:     "bg-transparent text-neutral-500 hover:bg-surface-subtle hover:text-neutral-900",
  danger:    "bg-coral text-white hover:bg-coral-dark",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-3 text-xs gap-1 rounded-sm",
  md: "h-9 px-4 text-sm gap-1.5 rounded-md",
  lg: "h-11 px-5 text-base gap-2 rounded-md",
};

export function Button({ variant = "secondary", size = "md", children, disabled, onClick }:
  { variant?: Variant; size?: Size; children: React.ReactNode; disabled?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex items-center justify-center font-medium
        transition-all duration-150 cursor-pointer select-none
        focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]}`}>
      {children}
    </button>
  );
}
```

**Variant specs (từ JSON #fa6e5b coral + #0f1835 navy):**

| Variant | Background | Text | Border |
|---|---|---|---|
| `primary` | `#fa6e5b` coral | white | none |
| `secondary` | white | `#333333` | `#e8ecf2` |
| `ghost` | transparent | `#5d6272` | none |
| `danger` | `#fa6e5b` coral | white | none |
| Disabled (any) | — | — | opacity 50% |

---

### 5.8 Input Field

```tsx
// components/ui/Input.tsx
export function Input({ label, hint, error, placeholder, disabled }:
  { label?: string; hint?: string; error?: string; placeholder?: string; disabled?: boolean }) {
  return (
    <div className="flex flex-col gap-1 mb-[14px]">
      {label && <label className="text-sm font-medium text-neutral-600">{label}</label>}
      <input
        placeholder={placeholder}
        disabled={disabled}
        className={`
          h-10 px-[16px] rounded-md border text-sm font-sans
          bg-white text-neutral-900 placeholder:text-neutral-400
          outline-none transition-all duration-150
          ${error
            ? "border-coral focus:shadow-focus-coral"
            : "border-neutral-200 hover:border-neutral-300 focus:border-brand/50 focus:shadow-focus"}
          disabled:bg-surface-subtle disabled:text-neutral-400
          disabled:border-neutral-200 disabled:cursor-not-allowed
        `}
      />
      {hint && !error && <p className="text-xs text-neutral-400">{hint}</p>}
      {error && <p className="text-xs text-coral">{error}</p>}
    </div>
  );
}
```

**States:**

| State | Border | Shadow | Background |
|---|---|---|---|
| Default | `#e8ecf2` | none | white |
| Hover | `#cccccc` | none | white |
| Focus | `brand/50` | `shadow-focus` orange glow | white |
| Error | `#fa6e5b` | `shadow-focus-coral` | white |
| Disabled | `#e8ecf2` | none | `#f4f6fa` |

---

### 5.9 Badge & Tag

```tsx
{/* Notification badge — màu coral từ JSON #fa6e5b */}
<span className="badge">3</span>
<span className="badge badge--dot bg-coral" />

{/* Inline tag / chip */}
<span className="tag tag--default">Draft</span>
<span className="tag tag--active">Active</span>
<span className="tag tag--brand">Beta</span>
```

---

### 5.10 Avatar

```tsx
{/* Gradient: từ JSON linear-gradient(156deg, #ff7265 0%, #7ac3ff 100%) */}
<div className="avatar avatar--md avatar--gradient" />

{/* Initial */}
<div className="avatar avatar--md">VG</div>

{/* Muted/inactive: từ JSON grayscale(0.3) + opacity:0.75 */}
<div className="avatar avatar--md avatar--muted">VG</div>

{/* With online status dot */}
<div className="relative inline-block">
  <div className="avatar avatar--md">M</div>
  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full
                   bg-green-400 border-2 border-white" />
</div>
```

**Size table:**

| Token | Size | Font | Dùng cho |
|---|---|---|---|
| `avatar--xs` | 24px | 10px | Inline, compact |
| `avatar--sm` | 32px | 12px | TopNav, list |
| `avatar--md` | 40px | 14px | Chat row (default livechat) |
| `avatar--lg` | 48px | 16px | Profile, modal |

---

### 5.11 Callout / Alert

```tsx
// components/docs/Callout.tsx
type CalloutType = "info" | "tip" | "warn" | "danger";
const icons: Record<CalloutType, string> = { info:"ℹ️", tip:"💡", warn:"⚠️", danger:"🚨" };

export function Callout({ type = "info", title, children }:
  { type?: CalloutType; title?: string; children: React.ReactNode }) {
  return (
    <div className={`callout callout-${type}`}>
      <span className="text-base flex-shrink-0 mt-0.5">{icons[type]}</span>
      <div className="flex-1">
        {title && <p className="font-semibold mb-1">{title}</p>}
        {children}
      </div>
    </div>
  );
}
```

---

### 5.12 Floating Action Button

```tsx
{/* Từ screenshot: ✦ icon, bottom-right, bg navy */}
<button className="fab" aria-label="Quick actions">
  <span className="text-lg">✦</span>
</button>
```

**Specs:**

| Property | Value | Class |
|---|---|---|
| Size | 48×48px | `w-12 h-12` |
| Background | `#0f1835` navy | `bg-navy` |
| Color | white | `text-white` |
| Radius | full | `rounded-full` |
| Shadow | `shadow-fab` | navy-based |
| Position | bottom-right | `fixed bottom-6 right-6` |
| Z-index | 80 | `z-[80]` |

---

### 5.13 Theme & Language Toggle

```tsx
{/* Theme toggle — sidebar footer */}
<div className="theme-toggle">
  <button className="theme-toggle-btn theme-toggle-btn--active">
    {/* Sun icon */}
  </button>
  <button className="theme-toggle-btn">
    {/* Moon icon */}
  </button>
</div>

{/* Language toggle */}
<button className="lang-toggle">
  <span>🇻🇳</span>
  <span>Tiếng Việt</span>
  <svg className="w-4 h-4 ml-auto rotate-180" ...>▼</svg>
</button>
```

---

## 6. Typography Prose (MDX Content)

```tsx
// components/docs/DocsProse.tsx
export function DocsProse({ children }: { children: React.ReactNode }) {
  return (
    <div className="
      prose max-w-none

      prose-headings:font-display prose-headings:tracking-tight prose-headings:text-neutral-900

      prose-h2:text-3xl  prose-h2:font-bold    prose-h2:mt-10 prose-h2:mb-4
      prose-h3:text-xl   prose-h3:font-semibold prose-h3:mt-6  prose-h3:mb-2
      prose-h4:text-base prose-h4:font-semibold

      prose-p:text-neutral-700 prose-p:leading-7 prose-p:text-base

      prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline

      prose-strong:text-neutral-900 prose-strong:font-semibold

      prose-code:text-neutral-800 prose-code:bg-surface-subtle
      prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
      prose-code:text-sm prose-code:border prose-code:border-surface-border
      prose-code:font-mono prose-code:before:content-none prose-code:after:content-none

      prose-pre:bg-neutral-900 prose-pre:text-neutral-100
      prose-pre:rounded-xl prose-pre:border prose-pre:border-neutral-800

      prose-blockquote:border-l-4 prose-blockquote:border-brand/40
      prose-blockquote:text-neutral-500 prose-blockquote:italic

      prose-li:text-neutral-700 prose-li:leading-7
      prose-hr:border-surface-border
      prose-table:text-sm
      prose-th:bg-surface-subtle prose-th:text-neutral-700 prose-th:font-semibold
      prose-td:text-neutral-600
    ">
      {children}
    </div>
  );
}
```

**Scale tổng hợp:**

| Element | Font | Size | Weight | Color | Từ |
|---|---|---|---|---|---|
| H1 page title | Sora display | 30px / `text-4xl` | 700 | `#0f1835` | Screenshot |
| H2 section | Sora display | 24px / `text-3xl` | 700 | `#0f1835` | Screenshot |
| H3 subsection | Sora display | 20px / `text-xl` | 600 | `#0f1835` | Screenshot |
| H4 | DM Sans | 16px / `text-lg` | 600 | `#333333` | JSON count:25 |
| Body / p | DM Sans | 14px / `text-base` | 400 | `#555555` | JSON 14px/400 |
| Description | DM Sans | 15px / `text-md` | 400 | `#5d6272` | JSON count:56 |
| Caption / meta | DM Sans | 12px / `text-xs` | 400 | `#afb2bd` | JSON count:60 |
| Code inline | JetBrains Mono | 13px / `text-sm` | 400 | `#333333` | — |
| Nav items | DM Sans | 13px / `text-sm` | 400–500 | `#5d6272` | JSON count:56 |

---

## 7. Dark Mode

```css
/* Thêm vào cuối globals.css */
.dark body                { @apply bg-neutral-900 text-neutral-100; }
.dark .docs-sidebar       { @apply bg-neutral-900 border-neutral-800; }
.dark .topnav             { @apply bg-neutral-900 border-neutral-800; }
.dark .nav-item           { @apply text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800; }
.dark .nav-item--active   { @apply text-brand bg-brand/10 hover:text-brand hover:bg-brand/10; }
.dark .sidebar-label      { @apply text-neutral-600; }
.dark .sidebar-divider    { @apply bg-neutral-800; }
.dark .search-input       { @apply bg-neutral-800 border-neutral-700 text-neutral-200 placeholder:text-neutral-500; }
.dark .copy-btn           { @apply bg-neutral-800 border-neutral-700 text-neutral-300; }
.dark .toc-item--h2       { @apply text-neutral-400; }
.dark .toc-item--h3       { @apply text-neutral-600; }
.dark .toc-item--active   { @apply text-brand; }
.dark .page-title         { @apply text-neutral-50; }
.dark .page-description   { @apply text-neutral-400; }
.dark .theme-toggle       { @apply bg-neutral-800; }
.dark .theme-toggle-btn--active { @apply bg-neutral-700 text-neutral-100; }
```

---

## 8. Responsive Behavior

| Breakpoint | Sidebar | TOC | Content padding |
|---|---|---|---|
| `< 768px` mobile | Drawer + overlay | hidden | `px-4 py-6` |
| `768–1023px` tablet | Drawer + overlay | hidden | `px-6 py-8` |
| `1024–1279px` laptop | Fixed visible | hidden | `px-8 py-10` |
| `≥ 1280px` desktop | Fixed visible | Fixed visible | `px-8 py-10` |

```tsx
{/* Mobile sidebar drawer */}
<aside className={`
  docs-sidebar scrollbar-none transition-transform duration-200
  ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
`}>
  <SidebarNav />
</aside>

{/* Mobile overlay */}
{open && (
  <div className="fixed inset-0 bg-navy/20 backdrop-blur-sm z-[35] lg:hidden"
       onClick={() => setOpen(false)} />
)}

{/* Hamburger */}
<button className="lg:hidden p-2 rounded-md text-neutral-500 hover:bg-surface-subtle">
  <svg className="w-5 h-5" .../>
</button>
```

---

## Quick Reference

```
LAYOUT CLASSES
  docs-shell         flex shell wrapper (pt-[56px])
  docs-sidebar       fixed left sidebar panel
  docs-main          flex-1 content area
  docs-main-inner    max-w-[780px] centered content
  docs-toc           fixed right TOC (hidden < xl)
  topnav             fixed top navigation bar

SIDEBAR
  sidebar-label      section header (GET STARTED…)
  nav-item           default link
  nav-item--active   orange active state (#ea580c on #fff7ed)
  nav-item--child    indented sub-item (ml-3)
  nav-item--parent   expandable group
  sidebar-divider    horizontal rule

SEARCH
  search-input       full search field with focus glow

BREADCRUMB
  breadcrumb         flex row wrapper
  breadcrumb-item    clickable link
  breadcrumb-sep     › separator char

PAGE
  page-title         h1 — Sora 30px/700
  page-description   subtitle — 15px #5d6272
  copy-btn           Sao chép trang button

TOC
  toc-title          "Trên trang này" label
  toc-item           link row
  toc-item--h2       normal weight #5d6272
  toc-item--h3       indented pl-3, xs, #999
  toc-item--active   #ea580c font-medium

AVATAR (từ JSON)
  avatar             base container
  avatar--xs/sm/md/lg  24/32/40/48px
  avatar--gradient   linear-gradient(156deg, #ff7265, #7ac3ff)
  avatar--muted      grayscale(0.3) + opacity:0.75

BADGE (từ JSON #fa6e5b)
  badge              coral notification count
  badge--dot         8px dot indicator

TAG
  tag--default       gray neutral
  tag--active        coral (#fa6e5b tint)
  tag--brand         orange brand

CALLOUT
  callout-info/tip/warn/danger

FAB
  fab                fixed bottom-6 right-6, bg-navy, rounded-full

TOGGLES
  theme-toggle       ☀/☽ pill
  lang-toggle        language selector
```

---

> **Cập nhật:** Feb 2026 · **Stack:** Next.js 14 App Router · Tailwind CSS v3 · TypeScript  
> **Nguồn token:** `design-analysis.json` (VIK Group Livechat) + SmaxAi Docs screenshot  
> **Fonts:** DM Sans (body/UI) · Sora (display) · JetBrains Mono (code)  
> **Plugin:** `@tailwindcss/typography` · `next-themes`
