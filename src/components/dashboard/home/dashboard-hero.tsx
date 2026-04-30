import { cn } from "@/lib/utils";

// ── Typography tokens ──────────────────────────────────────────────────────

const T_META =
  "text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground";
const T_BODY = "text-[14px] leading-relaxed text-muted-foreground";
const T_DISPLAY =
  "font-serif text-[38px] font-normal leading-[1.05] tracking-tight sm:text-[48px] md:text-[52px]";

// ── Date/greeting helpers ──────────────────────────────────────────────────

function formatHeaderDate(date = new Date()) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// ── Component ──────────────────────────────────────────────────────────────

interface DashboardHeroProps {
  displayName: string;
  statusMessage: string;
}

export function DashboardHero({ displayName, statusMessage }: DashboardHeroProps) {
  return (
    <header className="relative flex flex-col gap-4 px-1 pb-4 sm:px-2 sm:pb-6">
      {/* Ambient gradient decoration */}
      <div
        className="pointer-events-none absolute -top-8 left-1/2 h-[200px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-b from-brand/[0.04] to-transparent blur-3xl dark:from-brand/[0.06]"
        aria-hidden
      />
      
      <div className={cn(T_META, "relative")}>{formatHeaderDate()}</div>
      
      <h1 className={cn(T_DISPLAY, "relative text-foreground")}>
        {getGreeting()},{" "}
        <span className="italic text-brand">{displayName}.</span>
      </h1>
      
      <p className={cn(T_BODY, "relative max-w-xl")}>{statusMessage}</p>
    </header>
  );
}
