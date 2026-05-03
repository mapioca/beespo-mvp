import { createClient } from "@/lib/supabase/server";
import {
  createAgendaPlan,
  createProgramPlan,
  deleteAgendaPlan,
  deleteProgramPlan,
  getAgendaPlan,
  getProgramPlan,
  updateAgendaPlan,
  updateProgramPlan,
} from "@/lib/actions/plan-actions";
import { NextRequest, NextResponse } from "next/server";

async function getMeetingMeta(meetingId: string) {
  const supabase = await createClient();
  const { data } = await (supabase.from("meetings") as ReturnType<typeof supabase.from>)
    .select("id, plan_type")
    .eq("id", meetingId)
    .single();
  return data;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = await getMeetingMeta(id);

  if (meeting?.plan_type === "agenda") {
    const result = await getAgendaPlan(id);
    return NextResponse.json(result, { status: result.error ? 400 : 200 });
  }

  if (meeting?.plan_type === "program") {
    const result = await getProgramPlan(id);
    return NextResponse.json(result, { status: result.error ? 400 : 200 });
  }

  return NextResponse.json({ data: { type: null } });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const result = body.type === "program"
    ? await createProgramPlan({ ...body, meeting_id: id })
    : await createAgendaPlan({ ...body, meeting_id: id });

  return NextResponse.json(result, { status: result.error ? 400 : 201 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const meeting = await getMeetingMeta(id);

  const result = meeting?.plan_type === "program"
    ? await updateProgramPlan(body)
    : await updateAgendaPlan(body);

  return NextResponse.json(result, { status: result.error ? 400 : 200 });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const meeting = await getMeetingMeta(id);

  if (meeting?.plan_type === "program") {
    const { data } = await (supabase.from("program_documents") as ReturnType<typeof supabase.from>)
      .select("id")
      .eq("meeting_id", id)
      .single();
    const result = data?.id ? await deleteProgramPlan(data.id) : { success: true };
    return NextResponse.json(result, { status: result.error ? 400 : 200 });
  }

  const { data } = await (supabase.from("agenda_documents") as ReturnType<typeof supabase.from>)
    .select("id")
    .eq("meeting_id", id)
    .single();
  const result = data?.id ? await deleteAgendaPlan(data.id) : { success: true };
  return NextResponse.json(result, { status: result.error ? 400 : 200 });
}
