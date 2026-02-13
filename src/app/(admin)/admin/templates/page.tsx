import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminTemplatesLayout } from "@/components/admin/templates/admin-templates-layout";
import { FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function AdminTemplatesPage() {
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

  const { data: templates } = await adminClient
    .from("templates")
    .select("id, name, description, tags, is_shared, created_at, template_items(count)")
    .is("workspace_id", null)
    .eq("is_shared", true)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-6 w-6 text-zinc-400" />
            <h1 className="text-2xl font-bold text-zinc-100">
              Global Templates
            </h1>
          </div>
          <p className="text-zinc-400">
            Manage templates shared across all workspaces
          </p>
        </div>
        <Link href="/templates/new">
          <Button className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </Link>
      </div>

      <AdminTemplatesLayout templates={templates || []} />
    </div>
  );
}
