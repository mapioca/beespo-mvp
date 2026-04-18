import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const catalogCreateSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional().nullable(),
  category: z.string().trim().optional(),
  default_duration_minutes: z.number().int().min(0).optional(),
  icon: z.string().optional().nullable(),
  is_core: z.boolean().optional(),
  is_custom: z.boolean().optional(),
  is_hymn: z.boolean().optional(),
  hymn_number: z.number().int().optional().nullable(),
  requires_assignee: z.boolean().optional(),
  has_rich_text: z.boolean().optional(),
  order_hint: z.number().int().optional().nullable(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await (supabase.from("profiles") as ReturnType<typeof supabase.from>)
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  const { data, error } = await (supabase.from("catalog_items") as ReturnType<typeof supabase.from>)
    .select("*")
    .or(`workspace_id.is.null,workspace_id.eq.${profile?.workspace_id}`)
    .order("order_hint", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await (supabase.from("profiles") as ReturnType<typeof supabase.from>)
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  if (!["admin", "leader"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = catalogCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
  }

  const { data, error } = await (supabase.from("catalog_items") as ReturnType<typeof supabase.from>)
    .insert({ ...parsed.data, workspace_id: profile.workspace_id, is_custom: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}
