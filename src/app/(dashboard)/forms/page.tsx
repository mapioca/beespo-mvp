import { createClient } from "@/lib/supabase/server"
import { FormsClient } from "./forms-client"
import { Metadata } from "next"
import type { Form } from "@/types/form-types"
import { FormView } from "@/lib/table-views"
import { getDashboardRequestContext } from "@/lib/dashboard/request-context"

export const metadata: Metadata = {
    title: "Forms | Beespo",
    description: "Create and manage feedback forms",
}

export default async function FormsPage() {
    const [{ profile }, supabase] = await Promise.all([
        getDashboardRequestContext(),
        createClient(),
    ])

    // Fetch all forms for this workspace
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: forms, error } = await (supabase.from("forms") as any)
        .select("id, workspace_id, title, description, schema, slug, is_published, views_count, created_by, created_at, updated_at")
        .eq("workspace_id", profile.workspace_id)
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Forms query error:", error)
        return (
            <div className="p-8">Error loading forms. Please try again.</div>
        )
    }

    // Fetch submission counts per form
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: submissionCounts } = await (supabase.from("form_submissions") as any)
        .select("form_id")
        .in(
            "form_id",
            (forms || []).map((f: Form) => f.id)
        )

    const countsByFormId: Record<string, number> = {}
    ;(submissionCounts || []).forEach((row: { form_id: string }) => {
        countsByFormId[row.form_id] = (countsByFormId[row.form_id] || 0) + 1
    })

    const formsWithCounts = (forms || []).map((form: Form) => ({
        ...form,
        submissions_count: countsByFormId[form.id] || 0,
    }))

    const statusCounts: Record<string, number> = { published: 0, draft: 0 }
    formsWithCounts.forEach((f: Form & { submissions_count: number }) => {
        if (f.is_published) statusCounts.published++
        else statusCounts.draft++
    })

    // Fetch workspace-scoped form views
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: formViewsData } = await (supabase.from("agenda_views") as any)
        .select("id, workspace_id, created_by, name, view_type, filters, created_at, updated_at")
        .eq("workspace_id", profile.workspace_id)
        .eq("view_type", "forms")
        .order("created_at", { ascending: true })

    const initialViews: FormView[] = formViewsData ?? []

    return <FormsClient forms={formsWithCounts} statusCounts={statusCounts} initialViews={initialViews} />
}
