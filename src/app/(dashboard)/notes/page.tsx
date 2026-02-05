import { redirect } from "next/navigation";

/**
 * Redirect legacy /notes to /notebooks
 * Notes now live inside notebooks
 */
export default function NotesRedirectPage() {
    redirect("/notebooks");
}
