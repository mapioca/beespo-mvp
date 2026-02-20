import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";

export default async function Home() {
  const supabase = await createClient();
  const t = await getTranslations("Home");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect authenticated users to dashboard
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 sm:p-24">
      <div className="text-center space-y-8 max-w-3xl">
        <div className="space-y-4">
          <h1 className="text-6xl sm:text-7xl font-bold tracking-tight">
            {t("brandName")}
          </h1>
          <p className="text-xl sm:text-2xl text-muted-foreground">
            {t("tagline")}
          </p>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            {t("description")}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button asChild size="lg">
            <Link href="/signup">{t("getStarted")}</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">{t("signIn")}</Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {t("disclaimer")}
        </p>
      </div>
    </div>
  );
}
