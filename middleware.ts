import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware-utils";
import { cleanOutlineSlug } from "@/lib/docs/utils";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect Outline-style links: /doc/alias-ID -> /vi/alias
  if (pathname.startsWith("/doc/")) {
    const cleanSlug = cleanOutlineSlug(pathname);
    if (cleanSlug) {
      const url = request.nextUrl.clone();
      url.pathname = `/vi/${cleanSlug}`;
      return NextResponse.redirect(url, { status: 301 });
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
