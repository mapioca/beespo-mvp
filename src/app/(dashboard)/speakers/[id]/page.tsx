import { redirect } from "next/navigation";

export default function SpeakerDetailRedirect() {
    redirect("/meetings/directory");
}
