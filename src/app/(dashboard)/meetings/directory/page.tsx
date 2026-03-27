import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DirectoryClient } from "@/app/(dashboard)/participants/participants-client";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Directory | Beespo",
    description: "Manage people directory and assignments",
};

export const dynamic = "force-dynamic";

interface DirectoryPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DirectoryPage({ searchParams }: DirectoryPageProps) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const params = await searchParams;
    const searchQuery = typeof params?.search === "string" ? params.search : "";

    // Get user's profile and workspace
    const { data: profile } = await (supabase
        .from("profiles")
        .select("workspace_id, role")
        .eq("id", user.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .single() as any);

    if (!profile?.workspace_id) {
        redirect("/onboarding");
    }

    // Build query against directory table
    let query = supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("directory" as any)
        .select(
            `id, name, created_at, created_by,
             tags:directory_tag_assignments(tag:directory_tags(id, name, color))`,
            { count: "exact" }
        )
        .eq("workspace_id", profile.workspace_id);

    if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
    }

    const { data: rawParticipants, count, error } = await query.order("name");

    if (error) {
        console.error("Directory query error:", error);
        return <div className="p-8">Error loading directory. Please try again.</div>;
    }

    // Flatten tags from nested structure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const participants = (rawParticipants || []).map((p: any) => ({
        ...p,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tags: (p.tags || []).map((a: any) => a.tag).filter(Boolean),
    }));

    return (
        <DirectoryClient
            key={searchQuery}
            participants={participants}
            userRole={profile.role}
            totalCount={count || 0}
            currentSearch={searchQuery}
        />
    );
}
