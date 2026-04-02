import { Skeleton } from "@/components/ui/skeleton";

export default function TemplateLibraryLoading() {
  return (
    <div className="flex h-screen-dynamic flex-col bg-white">
      <div className="sticky top-0 z-10 bg-white">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-5 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-28 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-full" />
              </div>
              <Skeleton className="h-10 w-[480px] max-w-full" />
              <Skeleton className="h-5 w-[360px] max-w-full" />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Skeleton className="h-11 w-40 rounded-full" />
              <Skeleton className="h-11 w-[340px] rounded-full" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-28 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden bg-white px-5 pb-8 pt-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-col md:flex-row">
          <div className="hidden w-56 shrink-0 pr-8 md:block">
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-full" />
              ))}
            </div>
          </div>

          <div className="flex-1 md:pl-2">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[24px] border border-border/60 bg-white p-5 shadow-[0_14px_28px_rgba(15,23,42,0.05)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-2xl" />
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-5 w-36" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>

                  <div className="mt-4 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>

                  <div className="mt-4 rounded-[20px] border border-border/60 p-3.5">
                    <div className="flex items-center justify-between pb-2.5">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <div className="mt-3 space-y-2.5">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <div key={j} className="flex items-center gap-2.5">
                          <Skeleton className="h-5 w-5 rounded-full" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 space-y-3 border-t border-border/60 pt-3.5">
                    <Skeleton className="h-4 w-36" />
                    <div className="flex gap-1.5">
                      <Skeleton className="h-5 w-14 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-2">
                    <Skeleton className="h-9 flex-1 rounded-full" />
                    <Skeleton className="h-9 flex-1 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
