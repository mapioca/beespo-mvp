import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormEditClient } from "./form-edit-client";
import type { Form } from "@/types/form-types";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function FormEditPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Get the form
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: form, error } = await (supabase.from("forms") as any)
        .select("*")
        .eq("id", id)
        .single();

    if (error || !form) {
        notFound();
    }

    // Get submission count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: submissionCount } = await (supabase.from("form_submissions") as any)
        .select("*", { count: "exact", head: true })
        .eq("form_id", id);

    // Get workspace slug for sharing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: workspace } = await (supabase.from("workspaces") as any)
        .select("slug")
        .eq("id", form.workspace_id)
        .single();

    return (
        <FormEditClient
            form={form as Form}
            submissionCount={submissionCount || 0}
            workspaceSlug={workspace?.slug}
        />
    );
}
