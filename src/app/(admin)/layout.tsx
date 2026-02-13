import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
    title: "Beespo Admin Console",
    description: "Beespo platform administration",
};

/**
 * Root layout for all /admin/* routes.
 *
 * – Public children (e.g. /admin/login) are rendered directly.
 * – Authenticated children are wrapped in AdminShell which provides
 *   the sidebar, idle-timer, and admin-role guard.
 */
export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
            {children}
            <Toaster />
        </div>
    );
}
