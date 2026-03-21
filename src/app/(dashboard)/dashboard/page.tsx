import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/cached-queries";
import { HomeGreeting } from "./home-greeting";

const quotes = [
  "Great meetings don't happen by accident — they're built with intention.",
  "The agenda is ready when you are.",
  "Every gathering is an opportunity to move something forward.",
  "Preparation is the quiet side of leadership.",
  "Small meetings, thoughtfully run, change the world.",
];

function getDailyQuote(): string {
  const day = new Date().getDay();
  return quotes[day % quotes.length];
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Cache hit — layout already fetched this during the same request
  const profile = await getProfile(user.id);

  if (!profile?.workspace_id) redirect("/onboarding");

  const firstName = profile.full_name?.split(" ")[0] ?? "there";
  const quote = getDailyQuote();

  return (
    <div className="flex h-full items-center justify-center bg-white">
      <div className="max-w-lg px-8 text-center">
        {/* Greeting — rendered client-side to use browser local time */}
        <HomeGreeting firstName={firstName} />

        {/* Divider */}
        <div className="mx-auto my-8 h-px w-16 bg-gray-200" />

        {/* Daily quote */}
        <p className="text-base leading-relaxed text-gray-500 italic">
          &ldquo;{quote}&rdquo;
        </p>

        {/* Subtle CTA */}
        <p className="mt-10 text-sm text-gray-400">
          Use the sidebar to navigate to your meetings, templates, and more.
        </p>
      </div>
    </div>
  );
}
