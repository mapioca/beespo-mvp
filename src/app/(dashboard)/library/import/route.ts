import { NextResponse, type NextRequest } from "next/server";

import { cloneTemplateAction } from "@/app/(dashboard)/library/actions";

function safeInternalPath(pathname: string | null, fallback: string) {
  if (!pathname) return fallback;
  if (!pathname.startsWith("/")) return fallback;
  if (pathname.startsWith("//")) return fallback;
  return pathname;
}

export async function GET(request: NextRequest) {
  const templateId = request.nextUrl.searchParams.get("use");
  const redirectParam = request.nextUrl.searchParams.get("redirect");
  const redirectPath = safeInternalPath(redirectParam, "/library");

  if (!templateId) {
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  const result = await cloneTemplateAction(templateId);

  if (!result.success) {
    const destination = new URL(redirectPath, request.url);
    destination.searchParams.set("importError", "1");
    return NextResponse.redirect(destination);
  }

  const destination = new URL(redirectPath, request.url);
  destination.searchParams.set("tab", "mine");
  destination.searchParams.set("imported", result.id ?? templateId);
  return NextResponse.redirect(destination);
}
