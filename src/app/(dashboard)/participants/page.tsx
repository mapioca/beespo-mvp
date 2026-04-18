import { createClient } from "@/lib/supabase/server";
import { DirectoryClient } from "./directory-client";
import { Metadata } from "next";
import { getDashboardRequestContext } from "@/lib/dashboard/request-context";

export const metadata: Metadata = {
    title: "Directory | Beespo",
    description: "Manage people directory and assignments",
};

interface ParticipantsPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ParticipantsPage({ searchParams }: ParticipantsPageProps) {
    const [{ profile }, supabase] = await Promise.all([
        getDashboardRequestContext(),
        createClient(),
    ]);

    const params = await searchParams;
    const searchQuery = typeof params?.search === "string" ? params.search : "";

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
