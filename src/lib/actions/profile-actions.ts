"use server";

import { createClient } from "@/lib/supabase/server";

export async function updateLanguagePreference(language: "ENG" | "SPA") {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Not authenticated" };
    }

    const { error } = await (supabase.from("profiles") as ReturnType<typeof supabase.from>)
        .update({ language_preference: language })
        .eq("id", user.id);

    if (error) {
        return { error: error.message };
    }

    return { success: true };
}
