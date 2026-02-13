import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { IdleTimerProvider } from "@/components/admin/idle-timer-provider";

/**
 * Authenticated shell for admin pages.
 *
 * Checks:
 * 1. User is authenticated → else redirect to /admin/login
 * 2. User is a sys admin → else redirect to /admin/login?error=unauthorised
 *
 * Wraps children with the sidebar + idle-timer provider.
 */
export async function AdminShell({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/admin/login");
    }

    // Verify sys-admin role
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, is_sys_admin")
        .eq("id", user.id)
        .single();

    if (!profile?.is_sys_admin) {
        redirect("/admin/login?error=unauthorised");
    }

    return (
        <IdleTimerProvider>
            <div className="flex h-screen overflow-hidden">
                <AdminSidebar />
                <main className="flex-1 overflow-y-auto bg-zinc-900 p-6">
                    {children}
                </main>
            </div>
        </IdleTimerProvider>
    );
}
