# Documentation Template

A modern, AI-native documentation platform built with Next.js 15, Tailwind CSS, and shadcn/ui. Beautiful out-of-the-box, with dark mode, syntax highlighting, and AI assistant integration ready.

## Features

- **Dark/Light Mode** - Automatic theme detection with manual toggle
- **Syntax Highlighting** - Synchronous, fast code highlighting with copy-to-clipboard
- **AI Assistant Ready** - Floating dock and sheet panel for AI integration
- **Command Palette** - Quick search with ⌘K keyboard shortcut
- **Responsive Design** - Mobile-first with proper touch targets
- **Accessibility** - Skip links, ARIA labels, keyboard navigation
- **SEO Optimized** - Dynamic metadata, sitemap, robots.txt, OG images
- **Internationalization Ready** - Language selector component included

## Quick Start

1. **Clone and install**
   \`\`\`bash
   npx create-next-app@latest my-docs --example https://github.com/your-org/docs-template
   cd my-docs
   npm install
   \`\`\`

2. **Configure your site**
   Edit `lib/docs.config.ts` to customize:
   - Site name and description
   - Logo and branding
   - Navigation structure
   - Footer links

3. **Add your content**
   Edit `lib/docs/pages.ts` to add your documentation pages.

4. **Run development server**
   \`\`\`bash
   npm run dev
   \`\`\`

5. **Deploy to Vercel**
   \`\`\`bash
   npx vercel
   \`\`\`

## Project Structure

\`\`\`
├── app/
│   ├── docs/
│   │   ├── [...slug]/page.tsx  # Dynamic doc pages
│   │   ├── page.tsx            # Docs home
│   │   ├── layout.tsx          # Docs layout
│   │   └── loading.tsx         # Loading skeleton
│   ├── error.tsx               # Error boundary
│   ├── not-found.tsx           # 404 page
│   ├── globals.css             # Global styles & theme
│   └── layout.tsx              # Root layout
├── components/
│   ├── assistant/              # AI assistant components
│   ├── docs/                   # Doc-specific components
│   ├── layout/                 # Shell, sidebar, topbar
│   ├── search/                 # Command palette
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── docs/
│   │   ├── nav.ts              # Navigation structure
│   │   └── pages.ts            # Documentation content
│   ├── docs.config.ts          # Site configuration
│   └── syntax-highlight.ts     # Code highlighting
├── template-docs/              # Template documentation (see below)
└── public/                     # Static assets
\`\`\`

## Template Documentation

The `template-docs/` folder contains guides for template users:

\`\`\`
template-docs/
├── ai-search/                  # AI-powered search implementation guide
│   ├── README.md               # Overview and architecture
│   ├── 01-prerequisites.md     # Required services and setup
│   ├── 02-supabase-setup.md    # Database schema and RLS
│   ├── 03-vector-setup.md      # Upstash Vector configuration
│   ├── 04-ingestion.md         # Content chunking and embedding
│   ├── 05-search-api.md        # Semantic search endpoint
│   ├── 06-ai-chat.md           # RAG-based AI responses
│   ├── 07-ui-integration.md    # React hooks and components
│   └── 08-deployment.md        # Production deployment
└── ...                         # Additional guides
\`\`\`

**Important**: The `template-docs/` folder is for template users to reference when building their documentation site. You can safely delete this folder in production or keep it as internal documentation.

## Customization

### Site Configuration

Edit `lib/docs.config.ts` to change:

\`\`\`ts
export const siteConfig = {
  name: "Your Docs",
  description: "Your description",
  url: "https://your-domain.com",
  logo: {
    light: "/your-logo-light.svg",
    dark: "/your-logo-dark.svg",
  },
}
\`\`\`

### Theme Colors

Edit `app/globals.css` to customize colors:

\`\`\`css
:root {
  --primary: 238 84% 67%;        /* Indigo accent */
  --accent-light: 245 100% 85%;  /* Light accent */
}

.dark {
  --primary: 238 84% 67%;
  --accent-light: 245 100% 85%;
}
\`\`\`

### Navigation

Edit `lib/docs.config.ts` to modify the sidebar navigation:

\`\`\`ts
export const navigation: NavSection[] = [
  {
    title: "Getting Started",
    icon: Rocket,
    items: [
      { title: "Introduction", href: "/docs" },
      { title: "Installation", href: "/docs/installation" },
    ],
  },
]
\`\`\`

### Adding Pages

Add new pages to `lib/docs/pages.ts`:

\`\`\`ts
export const docPages: DocPage[] = [
  {
    slug: "my-new-page",
    title: "My New Page",
    description: "Description of my new page",
    content: `
# My New Page

Your markdown content here...

\`\`\`bash
npm install example
\`\`\`
    `,
  },
]
\`\`\`

## Environment Variables

Create `.env.local` with:

\`\`\`env
# Base URL for sitemap and OG images
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# Optional: Analytics
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
\`\`\`

See `.env.example` for all available variables.

## AI Integration

The template includes placeholder components for AI integration:

- **AssistantDock** - Floating input bar at bottom of page
- **AssistantSheet** - Slide-out panel for chat interface

To integrate AI-powered search with Supabase, Upstash Vector, and Vercel AI SDK, see the comprehensive guide in `template-docs/ai-search/README.md`.

Quick overview:
1. Set up Supabase for document storage and user analytics
2. Configure Upstash Vector for semantic search
3. Build ingestion pipeline to chunk and embed documentation
4. Create search API with hybrid keyword + vector search
5. Add RAG-based AI chat using Vercel AI Gateway
6. Integrate UI components with existing command palette

## Deployment

### Vercel (Recommended)

\`\`\`bash
npx vercel
\`\`\`

### Other Platforms

Build and export:

\`\`\`bash
npm run build
\`\`\`

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS 4
- **Components**: shadcn/ui
- **Icons**: Lucide React
- **Theme**: next-themes
- **Fonts**: Geist Sans & Mono

## License

MIT License - feel free to use this template for any project.
