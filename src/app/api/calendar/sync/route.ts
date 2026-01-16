import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { parseICalFeed } from "@/lib/ical-parser";

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

  // Get subscription
  const { data: subscription, error: subError } = await (supabase
    .from("calendar_subscriptions") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select("*")
    .eq("id", subscriptionId)
    .eq("workspace_id", profile.workspace_id)
    .single();

  if (subError || !subscription) {
    return NextResponse.json(
      { error: "Subscription not found" },
      { status: 404 }
    );
  }

  if (!subscription.is_enabled) {
    return NextResponse.json(
      { error: "Subscription is disabled" },
      { status: 400 }
    );
  }

  try {
    // Fetch iCal feed
    const response = await fetch(subscription.url, {
      headers: {
        "User-Agent": "Beespo Calendar/1.0",
        Accept: "text/calendar, application/calendar+json, */*",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch calendar: ${response.status} ${response.statusText}`);
    }

    const icalContent = await response.text();

    // Parse iCal
    const events = parseICalFeed(icalContent);

    // Get existing events for this subscription
    const { data: existingEvents } = await (supabase
      .from("external_calendar_events") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .select("id, external_uid")
      .eq("subscription_id", subscriptionId);

    const existingUids = new Set(existingEvents?.map((e: any) => e.external_uid) || []);
    const newUids = new Set(events.map((e) => e.uid));

    // Find events to delete (no longer in feed)
    const eventsToDelete = existingEvents?.filter(
      (e: any) => !newUids.has(e.external_uid)
    ) || [];

    // Delete removed events
    if (eventsToDelete.length > 0) {
      const deleteIds = eventsToDelete.map((e: any) => e.id);

      // First, delete any linked announcements
      const { data: links } = await (supabase
        .from("external_event_links") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("announcement_id")
        .in("external_event_id", deleteIds);

      if (links && links.length > 0) {
        const announcementIds = links.map((l: any) => l.announcement_id);
        await (supabase
          .from("announcements") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
          .delete()
          .in("id", announcementIds);
      }

      // Delete the external events
      await (supabase
        .from("external_calendar_events") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .delete()
        .in("id", deleteIds);
    }

    // Upsert events
    let created = 0;
    let updated = 0;

    for (const event of events) {
      const eventData = {
        subscription_id: subscriptionId,
        external_uid: event.uid,
        title: event.summary,
        description: event.description || null,
        start_date: event.dtstart.toISOString(),
        end_date: event.dtend?.toISOString() || null,
        location: event.location || null,
        is_all_day: event.isAllDay,
        raw_ical: event.rawVEvent,
      };

      if (existingUids.has(event.uid)) {
        // Update existing event
        const { error: updateError } = await (supabase
          .from("external_calendar_events") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
          .update(eventData)
          .eq("subscription_id", subscriptionId)
          .eq("external_uid", event.uid);

        if (!updateError) {
          updated++;

          // Update linked announcement if exists
          const { data: link } = await (supabase
            .from("external_event_links") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .select("announcement_id, external_calendar_events!inner(id)")
            .eq("external_calendar_events.subscription_id", subscriptionId)
            .eq("external_calendar_events.external_uid", event.uid)
            .single();

          if (link) {
            await (supabase
              .from("announcements") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
              .update({
                title: event.summary,
                content: event.description || null,
                schedule_date: event.dtstart.toISOString(),
              })
              .eq("id", link.announcement_id);
          }
        }
      } else {
        // Insert new event
        const { error: insertError } = await (supabase
          .from("external_calendar_events") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
          .insert(eventData);

        if (!insertError) {
          created++;
        }
      }
    }

    // Update subscription last synced time
    await (supabase
      .from("calendar_subscriptions") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .update({
        last_synced_at: new Date().toISOString(),
        sync_error: null,
      })
      .eq("id", subscriptionId);

    return NextResponse.json({
      success: true,
      eventsCreated: created,
      eventsUpdated: updated,
      eventsDeleted: eventsToDelete.length,
      totalEvents: events.length,
    });
  } catch (error) {
    // Update subscription with error
    const errorMessage = error instanceof Error ? error.message : "Unknown sync error";

    await (supabase
      .from("calendar_subscriptions") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .update({
        sync_error: errorMessage,
      })
      .eq("id", subscriptionId);

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
