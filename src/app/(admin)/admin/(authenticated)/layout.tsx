import { AdminShell } from "@/components/admin/admin-shell";

/**
 * Single authenticated layout for all admin pages that require login.
 * The AdminShell verifies auth + sys-admin role, then renders the
 * sidebar / idle-timer chrome around children.
 *
 * Route structure:
 *   (admin)/admin/(authenticated)/dashboard
 *   (admin)/admin/(authenticated)/users
 *   (admin)/admin/(authenticated)/templates
 */
export default function AuthenticatedAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AdminShell>{children}</AdminShell>;
}
