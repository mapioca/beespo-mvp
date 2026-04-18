import type { ElementType } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, CalendarDays, LayoutTemplate, BookOpen, Zap, MessageSquare } from "lucide-react";

function SectionHeaderSkeleton({
  icon: Icon,
  label,
}: {
  icon: ElementType;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      <Icon className="h-3.5 w-3.5 text-muted-foreground/40" strokeWidth={1.8} />
      <span className="text-[12px] font-medium text-muted-foreground/50 tracking-wide">
        {label}
      </span>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="h-full w-full overflow-y-auto bg-background rounded-[var(--radius)] border border-border shadow-sm">
      <div className="mx-auto max-w-3xl px-6 pt-16 pb-24 flex flex-col gap-10">

        {/* ── Greeting ─────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center justify-center gap-2">
          <Skeleton className="h-10 w-64 rounded-md" /> {/* Greeting + Name */}
          <Skeleton className="h-4 w-40 rounded-sm" /> {/* Workspace Name */}
        </div>

        {/* ── Quick Actions ─────────────────────────────────────────────── */}
        <section>
          <SectionHeaderSkeleton icon={Zap} label="Quick actions" />
          <div className="flex justify-center gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-[8px]" />
            ))}
          </div>
        </section>

        {/* ── Recents ──────────────────────────────────────────────────── */}
        <section>
          <SectionHeaderSkeleton icon={Clock} label="Recently visited" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[90px] w-[180px] shrink-0 rounded-[10px]" />
            ))}
          </div>
        </section>

        {/* ── This Week ────────────────────────────────────────────────── */}
        <section>
          <SectionHeaderSkeleton icon={CalendarDays} label="Upcoming events" />
          <div className="flex flex-col rounded-[12px] border border-[hsl(var(--cp-border))] overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`flex ${i !== 2 ? "border-b border-[hsl(var(--cp-border))]" : ""}`}
              >
                <div className="w-[140px] p-4 pt-4 shrink-0">
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex-1 p-4 flex flex-col gap-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Open Discussions ─────────────────────────────────────────── */}
        <section>
          <SectionHeaderSkeleton icon={MessageSquare} label="Open discussions" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[120px] w-[220px] shrink-0 rounded-[10px]" />
            ))}
          </div>
        </section>

        {/* ── Featured Templates ───────────────────────────────────────── */}
        <section>
          <SectionHeaderSkeleton icon={LayoutTemplate} label="Featured templates" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[126px] w-full rounded-[10px]" />
            ))}
          </div>
        </section>

        {/* ── Learn ─────────────────────────────────────────────────────── */}
        <section>
          <SectionHeaderSkeleton icon={BookOpen} label="Learn" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[210px] w-[260px] shrink-0 rounded-[10px]" />
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
