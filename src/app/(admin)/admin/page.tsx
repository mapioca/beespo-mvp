import { redirect } from "next/navigation";

/**
 * /admin root → redirect to /admin/dashboard (or /admin/login if not auth'd).
 * The AdminShell in the dashboard layout will handle the auth check.
 */
export default function AdminRootPage() {
    redirect("/admin/dashboard");
}
