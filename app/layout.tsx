import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { DocsShell } from "@/components/layout/docs-shell"
import "./globals.css"

const inter = Inter({ 
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "vietnamese"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "SmaxAI - Tài liệu hướng dẫn",
    template: "%s | SmaxAI Docs",
  },
  description: "Tài liệu hướng dẫn sử dụng SmaxAI - Nền tảng kinh doanh tự động với AI. Hướng dẫn chi tiết các tính năng, tích hợp và最佳 thực hành.",
  generator: "SmaxAI",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://docs.cdp.vn"),
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "SmaxAI Docs",
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/logo.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <DocsShell>{children}</DocsShell>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
