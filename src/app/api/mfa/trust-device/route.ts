import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTrustedDevice, setTrustedDeviceCookie } from "@/lib/mfa";

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

  const token = await createTrustedDevice(user.id, deviceName);
  await setTrustedDeviceCookie(token);

  return NextResponse.json({ success: true });
}
