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

  // 1. Run next-intl middleware first — it sets locale cookies, Accept-Language
  //    headers and rewrites the URL to /<locale>/... We MUST preserve this response.
  const response = handleI18nRouting(request);

  // 2. Initialize Supabase, piggybacking onto the i18n response.
  //    IMPORTANT: setAll must copy cookies onto the existing response object,
  //    never replace it — replacing would destroy the locale routing state.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // Apply cookies onto the i18n response — do NOT create a new NextResponse
          // here as that would discard the locale headers / rewrites.
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Extract the locale already present in the URL (e.g. "es" from /es/calendar/view).
  // Fall back to the default locale only when none is found.
  const localeMatch = pathname.match(new RegExp(`^/(${routing.locales.join('|')})`));
  const detectedLocale = localeMatch ? localeMatch[1] : routing.defaultLocale;

  // Strip the locale prefix for auth-rule comparisons.
  const pathWithoutLocale = pathname.replace(new RegExp(`^/(${routing.locales.join('|')})`), '') || '/';

  const protectedRoutes = ["/dashboard", "/templates", "/discussions", "/meetings", "/tasks", "/members", "/business", "/announcements", "/speakers", "/settings", "/calendar", "/callings", "/notebooks", "/apps"];
  const isProtectedRoute = protectedRoutes.some(route => pathWithoutLocale.startsWith(route));

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = `/${detectedLocale}/login`;
    return NextResponse.redirect(url);
  }

  if (user && (pathWithoutLocale === "/login" || pathWithoutLocale === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = `/${detectedLocale}/dashboard`;
    return NextResponse.redirect(url);
  }

  if (pathWithoutLocale === "/") {
    const url = request.nextUrl.clone();
    url.pathname = user ? `/${detectedLocale}/dashboard` : `/${detectedLocale}/login`;
    return NextResponse.redirect(url);
  }

  return response;

}

export const config = {
  matcher: [
    // Match only paths that need locale handling.
    // Explicitly exclude: API routes, auth callbacks, Next.js internals, and static assets.
    '/((?!api|auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
};
