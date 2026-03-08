import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { TemplateLibraryClient } from "@/components/templates/library/template-library-client";
import { LibraryTemplate } from "@/components/templates/library/types";

export const metadata: Metadata = {
  title: "Template Library | Beespo",
  description: "Browse and clone meeting templates for your organization.",
};

export const revalidate = 0;

export default async function TemplateLibraryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await (supabase.from("profiles") as ReturnType<typeof supabase.from>)
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/onboarding");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workspaceId = (profile as any).workspace_id as string | null;

  // Fetch Beespo Official (workspace_id IS NULL) + user's own workspace templates.
  // Community templates (is_public = true) are included once that column is added via migration.
  const filter = workspaceId
    ? `workspace_id.is.null,workspace_id.eq.${workspaceId}`
    : "workspace_id.is.null";

  const { data: templates, error: templatesError } = await (
    supabase.from("templates") as ReturnType<typeof supabase.from>
  )
    .select("*, items:template_items(*)")
    .or(filter)
    .order("created_at", { ascending: false });

  // Fetch author names separately to avoid FK join issues
  const createdByIds = [...new Set(
    ((templates ?? []) as { created_by: string | null }[])
      .map((t) => t.created_by)
      .filter(Boolean) as string[]
  )];

  const authorMap: Record<string, string> = {};
  if (createdByIds.length > 0) {
    const { data: authors } = await (supabase.from("profiles") as ReturnType<typeof supabase.from>)
      .select("id, full_name")
      .in("id", createdByIds);
    for (const a of (authors ?? []) as { id: string; full_name: string | null }[]) {
      if (a.full_name) authorMap[a.id] = a.full_name;
    }
  }

  // Attach author to each template
  const templatesWithAuthor = ((templates ?? []) as (Record<string, unknown> & { created_by: string | null })[]).map((t) => ({
    ...t,
    author: t.created_by ? { full_name: authorMap[t.created_by] ?? null } : null,
  }));

  if (templatesError) {
    console.error("Library query error:", templatesError.message);
  }

  return (
    <div className="flex flex-col h-screen-dynamic overflow-hidden">
      <TemplateLibraryClient
        templates={templatesWithAuthor as unknown as LibraryTemplate[]}
        workspaceId={workspaceId}
      />
    </div>
  );
}
