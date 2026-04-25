import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DISABLED_ROUTES = [
  "/library",
  "/forms",
  "/tables",
  "/notebooks",
  "/meetings/bishopric",
  "/meetings/ward-council",
  "/meetings/interviews",
  "/meetings/agendas",
  "/meetings/programs",
  "/meetings/assignments",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (DISABLED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
