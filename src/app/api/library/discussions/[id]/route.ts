import { deleteDiscussionLibraryItem, updateDiscussionLibraryItem } from "@/lib/actions/library-actions";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await updateDiscussionLibraryItem(id, await request.json());
  return NextResponse.json(result, { status: result.error ? 400 : 200 });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await deleteDiscussionLibraryItem(id);
  return NextResponse.json(result, { status: result.error ? 400 : 200 });
}
