import { redirect } from "next/navigation";

export default function SpeakerEditRedirect() {
    redirect("/meetings/directory");
}
