import { InboxClient } from "./inbox-client";
import { getInboxData } from "@/lib/actions/inbox-actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inbox | Beespo",
  description: "Tasks, calling processes, and items that need your attention.",
};

export default async function InboxPage() {
  const data = await getInboxData();

  if ("error" in data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-sm text-muted-foreground">{data.error}</p>
      </div>
    );
  }

  return <InboxClient {...data} />;
}
