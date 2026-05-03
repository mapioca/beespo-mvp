import { Skeleton } from "@/components/ui/skeleton";

export default function LibraryLoading() {
  return (
    <div className="flex h-screen-dynamic flex-col bg-white">
      <div className="sticky top-0 z-10 bg-white">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-5 py-5 sm:px-6 lg:px-8">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-5 w-96 max-w-full" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-full" />
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1500px] flex-1 px-5 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border p-5">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-5/6" />
              <Skeleton className="mt-6 h-9 w-40 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
