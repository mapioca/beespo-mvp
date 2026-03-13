import { SupabaseClient } from "@supabase/supabase-js";
import { parseICalFeed } from "@/lib/ical-parser";

export async function syncCalendarSubscription(
  supabase: SupabaseClient,
  subscriptionId: string
) {
  // Get subscription
  const { data: subscription, error: subError } = await (supabase
    .from("calendar_subscriptions") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select("*")
    .eq("id", subscriptionId)
    .single();

  if (subError || !subscription) {
    throw new Error("Subscription not found");
  }

  if (!subscription.is_enabled) {
    throw new Error("Subscription is disabled");
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
      throw new Error(
        `Failed to fetch calendar: ${response.status} ${response.statusText}`
      );
    }

    const icalContent = await response.text();

    // Parse iCal
    const events = parseICalFeed(icalContent);

    // Get existing events for this subscription
    const { data: existingEvents } = await (supabase
      .from("external_calendar_events") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .select("id, external_uid")
      .eq("subscription_id", subscriptionId);

    const existingUids = new Set(
      existingEvents?.map((e: { external_uid: string }) => e.external_uid) || []
    );
    const newUids = new Set(events.map((e) => e.uid));

    // Find events to delete (no longer in feed)
    const eventsToDelete =
      existingEvents?.filter(
        (e: { external_uid: string }) => !newUids.has(e.external_uid)
      ) || [];

    // Delete removed events
    if (eventsToDelete.length > 0) {
      const deleteIds = eventsToDelete.map((e: { id: string }) => e.id);

      // First, delete any linked announcements
      const { data: links } = await (supabase
        .from("external_event_links") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("announcement_id")
        .in("external_event_id", deleteIds);

      if (links && links.length > 0) {
        const announcementIds = links.map(
          (l: { announcement_id: string }) => l.announcement_id
        );
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

        if (updateError) {
          console.error(`Failed to update event ${event.uid}:`, updateError);
        } else {
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

        if (insertError) {
          console.error(`Failed to insert event ${event.uid}:`, insertError);
        } else {
          created++;
          // Important: add to existingUids so subsequent parsed events with the same UID correctly trigger an UPDATE
          existingUids.add(event.uid);
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

    return {
      success: true,
      eventsCreated: created,
      eventsUpdated: updated,
      eventsDeleted: eventsToDelete.length,
      totalEvents: events.length,
    };
  } catch (error) {
    // Update subscription with error
    const errorMessage =
      error instanceof Error ? error.message : "Unknown sync error";

    await (supabase
      .from("calendar_subscriptions") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .update({
        sync_error: errorMessage,
      })
      .eq("id", subscriptionId);

    throw new Error(errorMessage);
  }
}
