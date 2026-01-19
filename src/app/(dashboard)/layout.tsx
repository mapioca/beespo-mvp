import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Home, FileText, Calendar, CalendarDays, CheckSquare, MessageSquare, Briefcase, Megaphone, Mic, StickyNote, Users, Ticket } from "lucide-react";
import { SidebarUserProfile } from "@/components/dashboard/sidebar-user-profile";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("profiles") as any)
    .select("full_name, workspace_id, role, workspaces(name)")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    redirect("/setup");
  }

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Dashboard" },
    { href: "/calendar", icon: Calendar, label: "Calendar" },
    { href: "/templates", icon: FileText, label: "Templates" },
    { href: "/meetings", icon: CalendarDays, label: "Meetings" },
    { href: "/discussions", icon: MessageSquare, label: "Discussions" },
    { href: "/notes", icon: StickyNote, label: "Notes" },
    { href: "/business", icon: Briefcase, label: "Business" },
    { href: "/announcements", icon: Megaphone, label: "Announcements" },
    { href: "/speakers", icon: Mic, label: "Speakers" },
    { href: "/participants", icon: Users, label: "Participants" },
    { href: "/events", icon: Ticket, label: "Events" },
    { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  ];

  return (
    <div className="flex h-screen-dynamic">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card shrink-0">
        <div className="flex h-full flex-col">
          {/* Logo/Header */}
          <div className="border-b p-4">
            <Link href="/dashboard" className="block mb-2">
              <div className="relative h-12 w-48">
                <Image
                  src="/images/beespo-logo-full.svg"
                  alt="Beespo"
                  fill
                  className="object-contain object-left"
                />
              </div>
            </Link>
            <p className="text-sm text-muted-foreground pl-1">{profile?.workspaces?.name || "Workspace"}</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User Profile / Sign Out */}
          <SidebarUserProfile
            name={profile?.full_name || ""}
            email={user?.email || ""}
          />
        </div>
      </aside>

      {/* Main Content - flex-1 fills remaining width, overflow-hidden contains internal scrolling */}
      <main className="flex-1 min-w-0 overflow-hidden">{children}</main>
    </div>
  );
}
