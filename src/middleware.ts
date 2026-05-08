import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const DISABLED_ROUTES = [
  "/calendar",
  "/schedule",
  "/library",
  "/forms",
  "/tables",
  "/notebooks",
  "/notes",
  "/events",
  "/participants",
  "/apps",
  "/changelog",
  "/data",
  "/meetings/bishopric",
  "/meetings/ward-council",
  "/meetings/interviews",
  "/meetings/agendas",
  "/meetings/programs",
  "/meetings/assignments",
  "/meetings/agenda",
  "/meetings/program",
  "/meetings/overview",
  "/meetings/create",
  "/meetings/new",
];

const LEGACY_ROUTE_REDIRECTS: Array<{ from: string; to: string }> = [
  { from: "/meetings/agendas/discussions", to: "/discussions" },
  { from: "/meetings/sacrament-meeting/program-planner", to: "/meetings/sacrament/planner" },
  { from: "/meetings/sacrament-meeting/speaker-planner", to: "/meetings/sacrament/speakers" },
  { from: "/meetings/sacrament-meeting/business", to: "/meetings/sacrament/business" },
  { from: "/meetings/sacrament-meeting/archive", to: "/meetings/sacrament/archive" },
  { from: "/meetings/announcements", to: "/meetings/sacrament/announcements" },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  for (const { from, to } of LEGACY_ROUTE_REDIRECTS) {
    if (pathname === from || pathname.startsWith(`${from}/`)) {
      const newPath = pathname.replace(from, to);
      return NextResponse.redirect(new URL(newPath, request.url));
    }
  }

  if (DISABLED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
