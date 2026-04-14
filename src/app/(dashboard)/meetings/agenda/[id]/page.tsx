import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { MeetingBuilder } from "@/components/meetings/builder";
import { createClient } from "@/lib/supabase/server";
import { getDashboardRequestContext } from "@/lib/dashboard/request-context";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await (supabase.from("meetings") as ReturnType<typeof supabase.from>)
    .select("title")
    .eq("id", id)
    .single();
  const title = (data as { title?: string } | null)?.title ?? "Agenda";
  return { title: `${title} | Beespo` };
}

export default async function AgendaPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ profile }, supabase] = await Promise.all([
    getDashboardRequestContext(),
    createClient(),
  ]);

  const { data: meeting } = await (supabase.from("meetings") as ReturnType<typeof supabase.from>)
    .select("id, plan_type")
    .eq("id", id)
    .eq("workspace_id", profile.workspace_id)
    .single();

  if (!meeting) notFound();
  if (meeting.plan_type !== "agenda") redirect(`/meetings/${id}`);

  return (
    <MeetingBuilder
      initialMeetingId={id}
      initialEntryType="agenda"
      initialMode="planning"
    />
  );
}
