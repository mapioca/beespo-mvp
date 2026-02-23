import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChangelogView } from "@/components/release-notes/changelog-view";
import type { ReleaseNote } from "@/types/release-notes";

export default async function ChangelogPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: notes } = await (supabase.from("release_notes") as any)
    .select("*")
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });

  return <ChangelogView notes={(notes || []) as unknown as ReleaseNote[]} />;
}
