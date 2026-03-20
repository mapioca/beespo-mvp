import { redirect } from "next/navigation";

export default function NewSpeakerRedirect() {
    redirect("/meetings/directory");
}
