import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Helper: detect admin subdomain
// ---------------------------------------------------------------------------
function isAdminSubdomain(host: string): boolean {
  // Production: admin.beespo.com
  // Local dev:  admin.localhost / admin.localhost:3000
  return (
    host.startsWith("admin.beespo.com") ||
    host.startsWith("admin.localhost")
  );
}

// ---------------------------------------------------------------------------
// Helper: create Supabase SSR client from the middleware request/response pair
// ---------------------------------------------------------------------------
function createSupabaseMiddlewareClient(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  return { supabase, getResponse: () => supabaseResponse };
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  const { supabase, getResponse } = createSupabaseMiddlewareClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // =========================================================================
  // ADMIN SUBDOMAIN ROUTING
  // =========================================================================
  if (isAdminSubdomain(hostname)) {
    // Already an /admin path — let it through (layout handles auth/MFA)
    if (pathname.startsWith("/admin")) {
      // Unauthenticated users can only access /admin/login
      if (!user && pathname !== "/admin/login") {
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }
      return getResponse();
    }

    // Rewrite root → /admin/login or /admin/dashboard
    if (pathname === "/" || pathname === "") {
      const dest = user ? "/admin/dashboard" : "/admin/login";
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = dest;
      return NextResponse.rewrite(rewriteUrl, { request });
    }

    // Rewrite all other paths: /users → /admin/users, etc.
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/admin${pathname}`;
    return NextResponse.rewrite(rewriteUrl, { request });
  }

  // =========================================================================
  // BLOCK direct /admin/* access from non-admin hosts
  // =========================================================================
  if (pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // =========================================================================
  // MAIN APP ROUTING (unchanged)
  // =========================================================================

  // Protected routes - redirect to login if not authenticated
  const protectedRoutes = ["/dashboard", "/templates", "/discussions", "/meetings", "/tasks", "/members", "/business", "/announcements", "/speakers", "/settings", "/calendar", "/callings", "/notebooks", "/apps"];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect authenticated users away from auth pages (layout will handle setup redirect)
  if (user && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect root path to dashboard if authenticated, login if not
  if (pathname === "/") {
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return getResponse();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
