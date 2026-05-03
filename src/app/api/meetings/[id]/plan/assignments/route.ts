import { assignParticipant, getAssignmentsForPlanItem, removeAssignment } from "@/lib/actions/plan-actions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const assignableType = request.nextUrl.searchParams.get("assignableType");
  const assignableId = request.nextUrl.searchParams.get("assignableId");
  if (!assignableType || !assignableId) {
    return NextResponse.json({ error: "assignableType and assignableId are required" }, { status: 400 });
  }
  const result = await getAssignmentsForPlanItem(assignableType, assignableId);
  return NextResponse.json(result, { status: result.error ? 400 : 200 });
}

export async function POST(request: NextRequest) {
  const result = await assignParticipant(await request.json());
  return NextResponse.json(result, { status: result.error ? 400 : 201 });
}

export async function DELETE(request: NextRequest) {
  const assignmentId = request.nextUrl.searchParams.get("assignmentId");
  if (!assignmentId) {
    return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });
  }
  const result = await removeAssignment(assignmentId);
  return NextResponse.json(result, { status: result.error ? 400 : 200 });
}
