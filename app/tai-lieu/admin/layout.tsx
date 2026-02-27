
'use client'

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { useState, useEffect } from "react"
import { LayoutDashboard, Star, BarChart3, LogOut, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  // Use browser client for client-side auth check
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      // If no session and not on login page, redirect
      if (!session && pathname !== '/tai-lieu/admin/login') {
        router.push('/tai-lieu/admin/login')
      } else if (session && pathname === '/tai-lieu/admin/login') {
        // If session exists and on login page, redirect to dashboard
        router.push('/tai-lieu/admin')
        setIsAuthorized(true)
      } else {
        setIsAuthorized(!!session || pathname === '/tai-lieu/admin/login')
      }
      
      setIsLoading(false)
    }

    checkAuth()
  }, [pathname, router, supabase.auth])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/tai-lieu/admin/login')
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Login page layout (no sidebar)
  if (pathname === '/tai-lieu/admin/login') {
    return <div className="min-h-screen bg-muted/20">{children}</div>
  }

  // Not authorized
  if (!isAuthorized) {
    return null // Will redirect via useEffect
  }

  // Admin Dashboard Layout
  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-muted/20">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-card border-r border-border shrink-0">
        <div className="p-6 border-b border-border">
          <Link href="/tai-lieu/admin" className="flex items-center gap-2 font-bold text-xl">
            <span className="text-primary">SmaxAI</span> Admin
          </Link>
        </div>
        
        <nav className="p-4 space-y-2">
          <Link 
            href="/tai-lieu/admin" 
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium",
              pathname === "/tai-lieu/admin" 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Tổng quan
          </Link>
          
          <Link 
            href="/tai-lieu/admin/ratings" 
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium",
              pathname === "/tai-lieu/admin/ratings" 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <Star className="h-4 w-4" />
            Đánh giá
          </Link>
          
          <Link 
            href="/tai-lieu/admin/analytics" 
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium",
              pathname === "/tai-lieu/admin/analytics" 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <BarChart3 className="h-4 w-4" />
            Phân tích
          </Link>
        </nav>

        <div className="p-4 mt-auto border-t border-border">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 text-muted-foreground" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
