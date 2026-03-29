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
    const isMFASetup = pathname.startsWith("/mfa/setup");
    const isMFAVerify = pathname.startsWith("/mfa/verify");
    const isAdminPublicRoute = isAdminLoginPage || isAuthCallback || isMFASetup || isMFAVerify;

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
    if (!user && !isAdminPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // For authenticated users accessing dashboard or other protected routes, enforce MFA
    if (user && !isAdminPublicRoute && !isAdminLoginPage) {
      try {
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalData?.currentLevel !== 'aal2') {
          // MFA not verified - redirect to MFA verify
          const url = request.nextUrl.clone();
          url.pathname = "/mfa/verify";
          return NextResponse.redirect(url);
        }
      } catch (error) {
        // If we can't check AAL level, redirect to MFA verify for safety
        console.error('Failed to verify AAL level:', error);
        const url = request.nextUrl.clone();
        url.pathname = "/mfa/verify";
        return NextResponse.redirect(url);
      }
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
  // MAIN APP FLOW
  // =====================================================

  const pathname = request.nextUrl.pathname;

  // Public routes that never require authentication
  const publicRoutes = ["/shared"];
  const isMfaPage = pathname.startsWith("/mfa/setup") || pathname.startsWith("/mfa/verify");
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route)) || isMfaPage;
  if (isPublicRoute) {
    return supabaseResponse;
  }

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

  // MFA enforcement for authenticated users on protected routes
  if (user && isProtectedRoute) {
    try {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      // User has MFA enrolled but hasn't verified this session
      if (aalData?.nextLevel === "aal2" && aalData?.currentLevel !== "aal2") {
        // Check for trusted device cookie before redirecting
        const trustedDeviceToken = request.cookies.get("beespo_trusted_device")?.value;
        if (!trustedDeviceToken) {
          return NextResponse.redirect(new URL("/mfa/verify", request.url));
        }
        // If cookie exists, allow through — layout will validate the token against DB
      }
    } catch (error) {
      console.error("Failed to check MFA level:", error);
    }
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
