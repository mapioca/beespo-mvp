import { createSegmentLibraryItem, listSegmentLibraryItems } from "@/lib/actions/library-actions";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const result = await listSegmentLibraryItems();
  return NextResponse.json(result, { status: result.error ? 400 : 200 });
}

export async function POST(request: NextRequest) {
  const result = await createSegmentLibraryItem(await request.json());
  return NextResponse.json(result, { status: result.error ? 400 : 201 });
}
