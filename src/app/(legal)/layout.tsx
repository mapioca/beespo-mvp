import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";

export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = Boolean(user);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--lp-bg)" }}
    >
      <Nav isAuthenticated={isAuthenticated} />
      <main className="flex-1 pt-[var(--landing-nav-height)]">
        {children}
      </main>
      <Footer isAuthenticated={isAuthenticated} />
    </div>
  );
}
