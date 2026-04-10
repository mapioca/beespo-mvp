import { redirect } from "next/navigation"

export default function NewEventPage() {
  redirect("/calendar/view?create=event")
}
