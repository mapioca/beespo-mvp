import Link from "next/link";
import type { Metadata } from "next";
import { formatDistanceToNow } from "date-fns";
import { Bell, CalendarDays, Share2, Users } from "lucide-react";

import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { getNotifications } from "@/lib/actions/notification-actions";
import type { Notification } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Inbox | Beespo",
  description: "Review workspace notifications and items that need attention.",
};

const notificationIcons: Record<string, typeof Bell> = {
  meeting_shared: Share2,
  meeting_starting_soon: CalendarDays,
  meeting_status_changed: CalendarDays,
  workspace_member_joined: Users,
};

function getNotificationHref(notification: Notification) {
  const meta = notification.metadata;
  if (typeof meta?.meeting_id === "string") return `/meetings/${meta.meeting_id}`;
  return null;
}

export default async function InboxPage() {
  const { notifications, count } = await getNotifications({ limit: 50 });

  return (
    <div className="min-h-full">
      <Breadcrumbs />
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            Review recent workspace notifications and shared items.
          </p>
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Notifications</h2>
            <span className="text-xs text-muted-foreground">{count} total</span>
          </div>

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Shared meetings, reminders, and workspace updates will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = notificationIcons[notification.type] || Bell;
                const href = getNotificationHref(notification);
                const isUnread = !notification.read_at;
                const content = (
                  <div className={cn("flex gap-3 px-4 py-3 transition-colors", href && "hover:bg-muted/50")}>
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <p className={cn("min-w-0 flex-1 truncate text-sm", isUnread && "font-semibold")}>
                          {notification.title}
                        </p>
                        {isUnread ? (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                        ) : null}
                      </div>
                      {notification.body ? (
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                          {notification.body}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );

                return href ? (
                  <Link key={notification.id} href={href} className="block">
                    {content}
                  </Link>
                ) : (
                  <div key={notification.id}>{content}</div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
