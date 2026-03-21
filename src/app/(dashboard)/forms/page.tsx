import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { FormsClient } from "./forms-client"
import { Metadata } from "next"
import type { Form } from "@/types/form-types"

export const metadata: Metadata = {
    title: "Forms | Beespo",
    description: "Create and manage feedback forms",
}

export const dynamic = "force-dynamic"

export default async function FormsPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase.from("profiles") as any)
        .select("workspace_id")
        .eq("id", user.id)
        .single()

    if (!profile?.workspace_id) {
        redirect("/onboarding")
    }

    // Fetch all forms for this workspace
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: forms, error } = await (supabase.from("forms") as any)
        .select("*")
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

    return <FormsClient forms={formsWithCounts} statusCounts={statusCounts} />
}
