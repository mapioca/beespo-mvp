import { HomeGreeting } from "./home-greeting";
import { getDashboardRequestContext } from "@/lib/dashboard/request-context";
import { DashboardIsland } from "@/components/ui/dashboard-island";

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
  const { profile } = await getDashboardRequestContext();

  const firstName = profile.full_name?.split(" ")[0] ?? "there";
  const quote = getDailyQuote();

  return (
    <DashboardIsland className="flex items-center justify-center">
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
    </DashboardIsland>
  );
}
