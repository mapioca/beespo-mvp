import { notFound, redirect } from "next/navigation";
import { MeetingBuilder } from "@/components/meetings/builder";
import { createClient } from "@/lib/supabase/server";

export default async function ProgramPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: meeting } = await (supabase.from("meetings") as ReturnType<typeof supabase.from>)
    .select("id, plan_type")
    .eq("id", id)
    .single();

  if (!meeting) notFound();
  if (meeting.plan_type !== "program") redirect(`/meetings/${id}`);

  return (
    <MeetingBuilder
      initialMeetingId={id}
      initialEntryType="program"
      initialMode="planning"
    />
  );
}
