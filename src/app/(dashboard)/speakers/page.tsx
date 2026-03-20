import { redirect } from "next/navigation";

export default function SpeakersRedirect() {
    redirect("/meetings/directory");
}
