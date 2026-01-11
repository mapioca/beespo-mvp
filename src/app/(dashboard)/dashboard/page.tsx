import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get user profile with specific columns only
  const { data: profile } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("profiles") as any)
    .select("full_name, role")
    .eq("id", user?.id)
    .single();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Welcome to Beespo</h1>
        {profile && (
          <div className="space-y-2">
            <p className="text-xl text-muted-foreground">
              Hello, {profile.full_name}
            </p>
            <p className="text-sm text-muted-foreground capitalize">
              Role: {profile.role}
            </p>
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          Dashboard coming soon...
        </p>
      </div>
    </div>
  );
}
