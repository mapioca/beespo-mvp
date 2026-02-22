import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { ReleaseNoteEditor } from "@/components/admin/release-notes/release-note-editor";
import type { ReleaseNote } from "@/types/release-notes";

interface EditReleaseNotePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditReleaseNotePage({ params }: EditReleaseNotePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verify MFA
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalData?.currentLevel !== "aal2") {
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const hasVerifiedTOTP = factorsData?.totp?.some(f => f.status === "verified");
    redirect(hasVerifiedTOTP ? "/mfa/verify" : "/mfa/setup");
  }

  const adminClient = createAdminClient();

  const { data: note } = await adminClient
    .from("release_notes")
    .select("*")
    .eq("id", id)
    .single();

  if (!note) notFound();

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">Edit Release Note</h1>
      <ReleaseNoteEditor note={note as unknown as ReleaseNote} />
    </div>
  );
}
