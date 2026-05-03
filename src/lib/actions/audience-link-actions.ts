"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { generateSecureShareToken } from "@/lib/slug-helpers";
import { canEdit } from "@/lib/auth/role-permissions";

type AudienceLinkRow = {
    workspace_id: string;
    token: string;
    created_at: string;
    updated_at: string;
    rotated_at: string | null;
};

type LeaderContextOk = {
    ok: true;
    supabase: Awaited<ReturnType<typeof createClient>>;
    workspaceId: string;
};
type LeaderContextErr = { ok: false; error: string };
type LeaderContext = LeaderContextOk | LeaderContextErr;

async function requireWorkspaceLeader(): Promise<LeaderContext> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile, error: profileError } = await (supabase.from("profiles") as any)
        .select("workspace_id, role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
        return { ok: false, error: "Profile not found" };
    }

    if (!profile.workspace_id) {
        return { ok: false, error: "No workspace" };
    }

    if (!canEdit(profile.role)) {
        return { ok: false, error: "Insufficient permissions" };
    }

    return { ok: true, supabase, workspaceId: profile.workspace_id as string };
}

export async function getOrCreateAudienceLink(): Promise<
    { link: AudienceLinkRow; error?: undefined } | { link?: undefined; error: string }
> {
    const ctx = await requireWorkspaceLeader();
    if (!ctx.ok) return { error: ctx.error };

    const { supabase, workspaceId } = ctx;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase.from("workspace_audience_links") as any)
        .select("workspace_id, token, created_at, updated_at, rotated_at")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

    if (existing) {
        return { link: existing as AudienceLinkRow };
    }

    const token = generateSecureShareToken();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: created, error: insertError } = await (supabase.from("workspace_audience_links") as any)
        .insert({ workspace_id: workspaceId, token })
        .select("workspace_id, token, created_at, updated_at, rotated_at")
        .single();

    if (insertError || !created) {
        return { error: insertError?.message || "Failed to create audience link" };
    }

    return { link: created as AudienceLinkRow };
}

export async function regenerateAudienceToken(): Promise<
    { link: AudienceLinkRow; error?: undefined } | { link?: undefined; error: string }
> {
    const ctx = await requireWorkspaceLeader();
    if (!ctx.ok) return { error: ctx.error };

    const { supabase, workspaceId } = ctx;
    const token = generateSecureShareToken();
    const now = new Date().toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("workspace_audience_links") as any)
        .update({ token, rotated_at: now, updated_at: now })
        .eq("workspace_id", workspaceId)
        .select("workspace_id, token, created_at, updated_at, rotated_at")
        .single();

    if (error || !data) {
        return { error: error?.message || "Failed to regenerate token" };
    }

    revalidatePath("/settings");
    return { link: data as AudienceLinkRow };
}

function isIsoDate(value: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function publishPlannerEntryToAudience(
    meetingDate: string,
): Promise<
    { publishedAt: string; error?: undefined } | { publishedAt?: undefined; error: string }
> {
    if (!isIsoDate(meetingDate)) return { error: "Invalid meeting date" };

    const ctx = await requireWorkspaceLeader();
    if (!ctx.ok) return { error: ctx.error };

    const { supabase, workspaceId } = ctx;
    const publishedAt = new Date().toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("sacrament_planner_entries") as any)
        .update({ audience_published_at: publishedAt })
        .eq("workspace_id", workspaceId)
        .eq("meeting_date", meetingDate)
        .select("meeting_date, audience_published_at")
        .single();

    if (error || !data) {
        return { error: error?.message || "Failed to publish — make sure the program has been saved first." };
    }

    return { publishedAt: data.audience_published_at as string };
}

export async function unpublishPlannerEntryFromAudience(
    meetingDate: string,
): Promise<
    { success: true; error?: undefined } | { success?: undefined; error: string }
> {
    if (!isIsoDate(meetingDate)) return { error: "Invalid meeting date" };

    const ctx = await requireWorkspaceLeader();
    if (!ctx.ok) return { error: ctx.error };

    const { supabase, workspaceId } = ctx;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("sacrament_planner_entries") as any)
        .update({ audience_published_at: null })
        .eq("workspace_id", workspaceId)
        .eq("meeting_date", meetingDate);

    if (error) {
        return { error: error.message };
    }

    return { success: true };
}
