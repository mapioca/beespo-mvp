import { listDiscussions, createDiscussion } from "@/lib/actions/discussion-actions";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const result = await listDiscussions();
  return NextResponse.json(result, { status: result.error ? 400 : 200 });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await createDiscussion(body);
  return NextResponse.json(result, { status: result.error ? 400 : 201 });
}
