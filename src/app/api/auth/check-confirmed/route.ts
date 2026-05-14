import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Polled by the /check-email page to detect when the user has clicked the
 * confirmation link in another tab/window. Returns { confirmed: true } once
 * the current browser session sees a user with `email_confirmed_at` populated.
 *
 * Notes:
 * - If the confirmation happens in a different browser or device, this
 *   endpoint cannot detect it (no shared session cookie). That's an accepted
 *   limitation — users who confirm cross-device are expected to navigate
 *   manually from their inbox.
 * - We deliberately do not consult the admin client here to avoid enabling
 *   email-enumeration probes.
 */
export async function GET() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const confirmed = !!user?.email_confirmed_at;
    return NextResponse.json(
        { confirmed },
        { headers: { "Cache-Control": "no-store" } }
    );
}
