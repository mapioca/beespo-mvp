import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { syncCalendarSubscription } from "@/lib/calendar-sync-service";

// POST /api/calendar/sync - Sync a calendar subscription
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user profile
  const { data: profile } = await (supabase
    .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  // Only admins can sync calendars
  if (profile.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can sync external calendars" },
      { status: 403 }
    );
  }

  // Parse request body
  const body = await request.json();
  const { subscriptionId } = body;

  if (!subscriptionId) {
    return NextResponse.json(
      { error: "Subscription ID is required" },
      { status: 400 }
    );
  }

  // Verify access to subscription
  const { data: subscription, error: subError } = await (supabase
    .from("calendar_subscriptions") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select("id")
    .eq("id", subscriptionId)
    .eq("workspace_id", profile.workspace_id)
    .single();

  if (subError || !subscription) {
    return NextResponse.json(
      { error: "Subscription not found" },
      { status: 404 }
    );
  }

  try {
    const result = await syncCalendarSubscription(supabase, subscriptionId);
    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown sync error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
