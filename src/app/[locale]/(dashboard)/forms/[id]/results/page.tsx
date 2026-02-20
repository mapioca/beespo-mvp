import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResultsDashboardClient } from "./results-dashboard-client";
import type { Form, FormSubmission } from "@/types/form-types";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function FormResultsPage({ params }: PageProps) {
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

    // Get submissions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: submissions } = await (supabase.from("form_submissions") as any)
        .select("*")
        .eq("form_id", id)
        .order("submitted_at", { ascending: false });

    // Get daily submission counts for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: recentSubmissions } = await (supabase.from("form_submissions") as any)
        .select("submitted_at")
        .eq("form_id", id)
        .gte("submitted_at", thirtyDaysAgo.toISOString());

    // Group submissions by date
    const submissionsByDate: Record<string, number> = {};
    (recentSubmissions || []).forEach((sub: { submitted_at: string }) => {
        const date = sub.submitted_at.split("T")[0];
        submissionsByDate[date] = (submissionsByDate[date] || 0) + 1;
    });

    // Generate data for all 30 days
    const submissionsOverTime = [];
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        submissionsOverTime.push({
            date: dateStr,
            count: submissionsByDate[dateStr] || 0,
        });
    }

    return (
        <ResultsDashboardClient
            form={form as Form}
            submissions={(submissions || []) as FormSubmission[]}
            submissionsOverTime={submissionsOverTime}
        />
    );
}
