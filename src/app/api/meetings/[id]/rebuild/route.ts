import { rebuildLegacyMeeting } from "@/lib/actions/legacy-actions";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await rebuildLegacyMeeting(id, body?.targetPlanType === "program" ? "program" : "agenda");
  return NextResponse.json(result, { status: result.error ? 400 : 200 });
}
