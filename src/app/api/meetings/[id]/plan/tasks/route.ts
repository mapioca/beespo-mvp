import { linkTaskToDiscussionItem, unlinkTaskFromDiscussionItem } from "@/lib/actions/plan-actions";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const result = await linkTaskToDiscussionItem(await request.json());
  return NextResponse.json(result, { status: result.error ? 400 : 201 });
}

export async function DELETE(request: NextRequest) {
  const discussionItemId = request.nextUrl.searchParams.get("discussionItemId");
  const taskId = request.nextUrl.searchParams.get("taskId");
  if (!discussionItemId || !taskId) {
    return NextResponse.json({ error: "discussionItemId and taskId are required" }, { status: 400 });
  }
  const result = await unlinkTaskFromDiscussionItem(discussionItemId, taskId);
  return NextResponse.json(result, { status: result.error ? 400 : 200 });
}
