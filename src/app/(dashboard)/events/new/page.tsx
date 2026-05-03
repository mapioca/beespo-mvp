import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { CreateEventFormLoader } from "./create-event-form-loader";

export const metadata: Metadata = {
  title: "Create Event | Beespo",
};

export default function CreateEventPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CreateEventFormLoader />
    </Suspense>
  );
}
