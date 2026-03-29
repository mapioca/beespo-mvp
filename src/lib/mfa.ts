import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import crypto from "crypto";

const TRUSTED_DEVICE_COOKIE = "beespo_trusted_device";
const TRUSTED_DEVICE_DAYS = 30;

export async function checkTrustedDevice(userId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TRUSTED_DEVICE_COOKIE)?.value;
  if (!token) return false;

  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("trusted_devices")
    .select("id, expires_at")
    .eq("user_id", userId)
    .eq("device_token", token)
    .single() as { data: { id: string; expires_at: string } | null };

  if (!data) return false;

  // Check if expired
  if (new Date(data.expires_at) < new Date()) {
    // Clean up expired token
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("trusted_devices").delete().eq("id", data.id);
    return false;
  }

  return true;
}

export async function createTrustedDevice(userId: string, deviceName?: string | null): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TRUSTED_DEVICE_DAYS);

  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("trusted_devices").insert({
    user_id: userId,
    device_token: token,
    device_name: deviceName || null,
    expires_at: expiresAt.toISOString(),
  });

  return token;
}

export async function setTrustedDeviceCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(TRUSTED_DEVICE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TRUSTED_DEVICE_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

export async function clearTrustedDeviceCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(TRUSTED_DEVICE_COOKIE);
}

export async function revokeUserTrustedDevices(userId: string) {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("trusted_devices").delete().eq("user_id", userId);
}

export async function checkWorkspaceMfaRequired(workspaceId: string): Promise<boolean> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("workspaces")
    .select("mfa_required")
    .eq("id", workspaceId)
    .single() as { data: { mfa_required: boolean } | null };

  return data?.mfa_required ?? false;
}
