"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function updateLanguagePreference(language: "ENG" | "SPA") {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Not authenticated" };
    }

    const { data: profile } = await (supabase.from("profiles") as ReturnType<typeof supabase.from>)
        .select("workspace_id")
        .eq("id", user.id)
        .single();

    const { error } = await (supabase.from("profiles") as ReturnType<typeof supabase.from>)
        .update({ language_preference: language })
        .eq("id", user.id);

    if (error) {
        return { error: error.message };
    }

    if (profile?.workspace_id) {
        // Keep existing published/audience entries aligned with the current
        // content language. User-authored fields inside meeting_state are left
        // untouched; renderers translate generated labels at display time.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: entries } = await (supabase.from("sacrament_planner_entries") as any)
            .select("id, meeting_state")
            .eq("workspace_id", profile.workspace_id);

        await Promise.all(
            ((entries ?? []) as Array<{ id: string; meeting_state: unknown }>).map((entry) => {
                const meetingState =
                    entry.meeting_state && typeof entry.meeting_state === "object"
                        ? { ...(entry.meeting_state as Record<string, unknown>) }
                        : {};

                return (supabase.from("sacrament_planner_entries") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                    .update({ meeting_state: { ...meetingState, contentLanguage: language } })
                    .eq("id", entry.id);
            })
        );
    }

    revalidatePath("/settings/language");
    revalidatePath("/meetings/sacrament/planner");

    return { success: true };
}
