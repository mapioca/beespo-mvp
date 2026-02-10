import { redirect } from "next/navigation";

// Primary redirect is handled in next.config.ts at the routing layer.
// This is a fallback for edge cases where the config redirect doesn't apply.
export default function CalendarPage() {
  redirect("/calendar/view");
}
