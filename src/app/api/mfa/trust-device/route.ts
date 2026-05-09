import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTrustedDevice, setTrustedDeviceCookie } from "@/lib/mfa";

const TRUSTED_DEVICE_COOKIE = "beespo_trusted_device";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user has actually completed MFA (is at AAL2)
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalData?.currentLevel !== "aal2") {
    return NextResponse.json({ error: "MFA not verified" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const deviceName = body.deviceName || null;

  // If this browser already had a trusted-device row, replace it instead of
  // stacking. Otherwise re-trusting the same browser (or trusting on every
  // login before the MFA flow honored the cookie) accumulates duplicate rows
  // in `trusted_devices` for the same user.
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(TRUSTED_DEVICE_COOKIE)?.value;
  if (existingToken) {
    const adminClient = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from("trusted_devices")
      .delete()
      .eq("user_id", user.id)
      .eq("device_token", existingToken);
  }

  const token = await createTrustedDevice(user.id, deviceName);
  await setTrustedDeviceCookie(token);

  return NextResponse.json({ success: true });
}
