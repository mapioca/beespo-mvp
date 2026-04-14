"use client";

import { useSearchParams } from "next/navigation";
import { CreateEventForm } from "@/components/events/create-event-form";
import type { CreateEventFormProps } from "@/components/events/create-event-form";

/**
 * Reads URL search params and passes them as initial values to the form.
 *
 * URL params:
 *   ?type=activity|interview|meeting   — pre-selects event type
 *   ?plan=agenda|program               — pre-selects plan type (implies type=meeting)
 *   ?date=yyyy-MM-dd                   — pre-fills the date picker
 */
export function CreateEventFormLoader() {
  const searchParams = useSearchParams();

  const rawType = searchParams.get("type");
  const rawPlan = searchParams.get("plan");
  const rawDate = searchParams.get("date");

  const plan = rawPlan === "agenda" || rawPlan === "program" ? rawPlan : undefined;

  // If a plan is preset, the event type must be meeting
  const eventType: CreateEventFormProps["initialEventType"] =
    plan != null
      ? "meeting"
      : rawType === "activity" || rawType === "interview" || rawType === "meeting"
      ? rawType
      : undefined;

  const date = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : undefined;

  return (
    <CreateEventForm
      initialEventType={eventType}
      initialPlanType={plan}
      initialDate={date}
    />
  );
}
