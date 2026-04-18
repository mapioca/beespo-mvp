import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  scheduled_date: z.string().datetime().optional(),
  modality: z.enum(["online", "in_person", "hybrid"]).nullable().optional(),
  presiding_name: z.string().nullable().optional(),
  conducting_name: z.string().nullable().optional(),
  chorister_name: z.string().nullable().optional(),
  organist_name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
  plan_type: z.enum(["agenda", "program", "external"]).nullable().optional(),
  external_plan_url: z.string().url().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await (supabase.from("profiles") as ReturnType<typeof supabase.from>)
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const updatePayload: Record<string, unknown> = { ...parsed.data };
  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await (supabase.from("meetings") as ReturnType<typeof supabase.from>)
    .update(updatePayload)
    .eq("id", id)
    .eq("workspace_id", profile.workspace_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  return NextResponse.json({ meeting: data });
}
