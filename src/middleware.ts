import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./routing";

// Initialize next-intl middleware
const handleI18nRouting = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const adminHost = process.env.NEXT_PUBLIC_ADMIN_HOST || "admin.localhost:3000";
  const isAdminSubdomain = host === adminHost || host.startsWith("admin.");

  // =====================================================
  // ADMIN SUBDOMAIN FLOW (No i18n)
  // =====================================================
  if (isAdminSubdomain) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    const pathname = request.nextUrl.pathname;
    const isAdminLoginPage = pathname === "/login";
    const isAuthCallback = pathname.startsWith("/auth/callback");

    if (user && isAdminLoginPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = user ? "/dashboard" : "/login";
      return NextResponse.redirect(url);
    }

    if (!user && !isAdminLoginPage && !isAuthCallback) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    if (!pathname.startsWith("/admin")) {
      const url = request.nextUrl.clone();
      url.pathname = `/admin${pathname}`;
      const response = NextResponse.rewrite(url);
      supabaseResponse.cookies.getAll().forEach(cookie => {
        response.cookies.set(cookie.name, cookie.value);
      });
      return response;
    }

    return supabaseResponse;
  }

  // =====================================================
  // MAIN APP FLOW (With i18n + Supabase)
  // =====================================================

  // 1. Run next-intl middleware to handle redirects, headers (Accept-Language), and rewrites.
  // This will return a NextResponse that already has locale cookies and rewritten URLs set.
  let response = handleI18nRouting(request);

  // 2. Initialize Supabase, applying cookies to the i18n response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // Create a new response maintaining the i18n routing rewrite/redirect state
          response = NextResponse.next({ request });
          // If the i18n routing wanted to redirect, we should respect that, but still apply cookies.
          // For simplicity in composed middleware, modifying the outgoing response headers directly is safer:
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Use the `pathname` string after i18n processing. 
  // Normally request.nextUrl.pathname is the raw path (e.g. `/dashboard`),
  // but we can just parse the path without the `/[locale]` prefix for logic testing if needed.
  // next-intl expects the app to live in `/[locale]/...`
  const pathname = request.nextUrl.pathname;

  // We should extract the path discarding the locale prefix for auth rules
  const pathWithoutLocale = pathname.replace(new RegExp(`^/(${routing.locales.join('|')})`), '') || '/';

  const protectedRoutes = ["/dashboard", "/templates", "/discussions", "/meetings", "/tasks", "/members", "/business", "/announcements", "/speakers", "/settings", "/calendar", "/callings", "/notebooks", "/apps"];
  const isProtectedRoute = protectedRoutes.some(route => pathWithoutLocale.startsWith(route));

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = `/${routing.defaultLocale}/login`;
    // Wait, next-intl redirect might be better, but we let Next.js handle it
    url.pathname = `/login`; // next-intl handleI18nRouting will prefix this again if we pass it through it, but we are returning directly.
    return NextResponse.redirect(url);
  }

  if (user && (pathWithoutLocale === "/login" || pathWithoutLocale === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = `/dashboard`;
    return NextResponse.redirect(url);
  }

  if (pathWithoutLocale === "/") {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/dashboard" : "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Enable a redirect to a matching locale at the root
    '/',

    // Set a cookie to remember the previous locale for all requests that have a locale prefix
    '/(en|es)/:path*',

    // Enable redirects that add the locale prefix. Allow all paths except for static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
