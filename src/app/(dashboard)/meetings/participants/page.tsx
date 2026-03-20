import { redirect } from "next/navigation";

// Redirect old route to new directory route
export default function ParticipantsRedirect() {
    redirect("/meetings/directory");
}
