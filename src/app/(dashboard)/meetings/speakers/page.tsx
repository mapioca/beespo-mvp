import { redirect } from "next/navigation";

export default function MeetingSpeakersRedirect() {
    redirect("/meetings/directory");
}
