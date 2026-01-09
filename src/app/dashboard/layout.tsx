import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Home, FileText, Calendar, CheckSquare, Users, LogOut, MessageSquare, Briefcase, Megaphone, Mic } from "lucide-react";

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
    .select("full_name, organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    redirect("/setup");
  }

  const handleSignOut = async () => {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  };

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Dashboard" },
    { href: "/templates", icon: FileText, label: "Templates" },
    { href: "/meetings", icon: Calendar, label: "Meetings" },
    { href: "/discussions", icon: MessageSquare, label: "Discussions" },
    { href: "/business", icon: Briefcase, label: "Business" },
    { href: "/announcements", icon: Megaphone, label: "Announcements" },
    { href: "/speakers", icon: Mic, label: "Speakers" },
    { href: "/tasks", icon: CheckSquare, label: "Tasks" },
    { href: "/members", icon: Users, label: "Members" },
  ];

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card">
        <div className="flex h-full flex-col">
          {/* Logo/Header */}
          <div className="border-b p-6">
            <h1 className="text-2xl font-bold">Beespo</h1>
            <p className="text-sm text-muted-foreground">{profile?.full_name}</p>
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

          {/* Sign Out */}
          <div className="border-t p-4">
            <form action={handleSignOut}>
              <Button
                type="submit"
                variant="ghost"
                className="w-full justify-start"
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
