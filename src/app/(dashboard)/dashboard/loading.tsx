import { Skeleton } from "@/components/ui/skeleton";

const PANEL_BASE =
  "rounded-[22px] border border-border/70 bg-background shadow-[0_1px_0_rgba(15,23,42,0.03)]";

function ChipSkeleton({ width }: { width: string }) {
  return <Skeleton className={`h-7 rounded-full ${width}`} />;
}

function SummarySegmentSkeleton() {
  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
    </div>
  );
}

function OverviewRowSkeleton() {
  return <Skeleton className="h-[50px] w-full rounded-[12px]" />;
}

function QueueCardSkeleton() {
  return (
    <section className={`${PANEL_BASE} px-4 py-4 sm:px-5 sm:py-5`}>
      <div className="flex items-start justify-between gap-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
      <div className="mt-4 space-y-1">
        <Skeleton className="h-16 w-full rounded-[12px]" />
        <Skeleton className="h-16 w-full rounded-[12px]" />
        <Skeleton className="h-16 w-full rounded-[12px]" />
      </div>
    </section>
  );
}

export default function DashboardLoading() {
  return (
    <div className="h-full w-full overflow-y-auto bg-surface-canvas text-foreground">
      <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="px-1 py-2 sm:px-2">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-72 sm:h-12 sm:w-96" />
            <Skeleton className="h-6 w-full max-w-2xl" />
          </div>
        </section>

        <section className={`${PANEL_BASE} px-4 py-4 sm:px-5 sm:py-5`}>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <Skeleton className="mb-2 h-4 w-24" />
                <Skeleton className="h-10 w-72 sm:w-96" />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <ChipSkeleton width="w-36" />
                  <ChipSkeleton width="w-24" />
                  <ChipSkeleton width="w-28" />
                </div>
              </div>
              <Skeleton className="h-10 w-32 rounded-full" />
            </div>
          </div>
        </section>

        <section className={`${PANEL_BASE} overflow-hidden`}>
          <div className="grid divide-y divide-border/70 md:grid-cols-3 md:divide-x md:divide-y-0">
            <SummarySegmentSkeleton />
            <SummarySegmentSkeleton />
            <SummarySegmentSkeleton />
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-3">
          <section className={`${PANEL_BASE} px-4 py-4 sm:px-5 sm:py-5`}>
            <div className="flex items-start justify-between gap-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
            <div className="mt-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <OverviewRowSkeleton key={i} />
              ))}
            </div>
          </section>

          <QueueCardSkeleton />
          <QueueCardSkeleton />
        </div>
      </main>
    </div>
  );
}
