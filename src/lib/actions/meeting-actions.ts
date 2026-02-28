"use server";

import { createClient } from "@/lib/supabase/server";

export async function saveMeetingMarkdown(meetingId: string, markdown: string) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: "Not authenticated" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("meetings") as any)
        .update({ markdown_agenda: markdown })
        .eq("id", meetingId);

    if (error) {
        console.error("Failed to save meeting markdown:", error);
        return { error: error.message };
    }

    return { success: true };
}
