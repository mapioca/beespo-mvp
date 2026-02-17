import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

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
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const host = request.headers.get("host") || "";
  const adminHost = process.env.NEXT_PUBLIC_ADMIN_HOST || "admin.localhost:3000";
  const isAdminSubdomain = host === adminHost || host.startsWith("admin.");

  // =====================================================
  // ADMIN SUBDOMAIN FLOW
  // =====================================================
  if (isAdminSubdomain) {
    const pathname = request.nextUrl.pathname;

    // Admin public routes (no auth required)
    const isAdminLoginPage = pathname === "/login";
    const isAuthCallback = pathname.startsWith("/auth/callback");

    // Authenticated admin user on login page → redirect to dashboard
    if (user && isAdminLoginPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // Root path → redirect to dashboard or login
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = user ? "/dashboard" : "/login";
      return NextResponse.redirect(url);
    }

    // Protected admin routes: everything except login, auth callback, and MFA pages
    if (!user && !isAdminLoginPage && !isAuthCallback) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // Rewrite admin subdomain requests to /admin/* route group internally
    if (!pathname.startsWith("/admin")) {
      const url = request.nextUrl.clone();
      url.pathname = `/admin${pathname}`;
      const response = NextResponse.rewrite(url);
      // Copy cookies from supabaseResponse
      supabaseResponse.cookies.getAll().forEach(cookie => {
        response.cookies.set(cookie.name, cookie.value);
      });
      return response;
    }

    return supabaseResponse;
  }

  // =====================================================
  // MAIN APP FLOW (existing logic unchanged)
  // =====================================================

  // Protected routes - redirect to login if not authenticated
  const protectedRoutes = ["/dashboard", "/templates", "/discussions", "/meetings", "/tasks", "/members", "/business", "/announcements", "/speakers", "/settings", "/calendar", "/callings", "/notebooks", "/apps"];
  const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route));

  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect authenticated users away from auth pages (layout will handle setup redirect)
  if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
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
