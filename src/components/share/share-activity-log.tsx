"use client";

import { useState, useEffect } from "react";
import { Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import type { ShareActivityAction } from "@/types/share";

interface ActivityEntry {
  id: string;
  action: ShareActivityAction;
  entity_type: string;
  entity_id: string | null;
  target_email: string | null;
  sharing_group_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  performer: { full_name: string | null; email: string } | null;
  sharing_groups: { name: string } | null;
}

interface ShareActivityLogProps {
  meetingId?: string;   // scope to a specific meeting
  entityType?: string;  // default: all
  showTitle?: boolean;
}

function describeAction(entry: ActivityEntry): string {
  const performer = entry.performer?.full_name || entry.performer?.email || "Someone";
  const groupName = entry.sharing_groups?.name;
  const target = entry.target_email ?? "unknown";
  const meetingTitle = (entry.details?.meeting_title as string) || "a meeting";
  const permission = entry.details?.permission as string | undefined;
  const permLabel = permission === "editor" ? "editors" : "viewers";

  switch (entry.action) {
    case "shared":
      if (groupName) {
        return `${performer} shared "${meetingTitle}" with ${groupName} as ${permLabel}`;
      }
      return `${performer} shared "${meetingTitle}" with ${target} as ${permLabel.slice(0, -1)}`;

    case "revoked":
      return `${performer} revoked access for ${target}`;

    case "group_created": {
      const name = (entry.details?.group_name as string) || groupName || "a group";
      return `${performer} created sharing group "${name}"`;
    }

    case "group_updated": {
      const name = (entry.details?.group_name as string) || groupName || "a group";
      return `${performer} updated sharing group "${name}"`;
    }

    case "member_added":
      return `${performer} added ${target} to ${groupName ?? "a group"}`;

    case "member_removed":
      return `${performer} removed ${target} from ${groupName ?? "a group"}`;

    default:
      return `${performer} performed an action`;
  }
}

const ACTION_ICONS: Record<ShareActivityAction, string> = {
  shared: "↗",
  revoked: "✕",
  group_created: "＋",
  group_updated: "✎",
  member_added: "＋",
  member_removed: "−",
};

const ACTION_COLORS: Record<ShareActivityAction, string> = {
  shared: "text-blue-600 bg-blue-50",
  revoked: "text-red-600 bg-red-50",
  group_created: "text-green-600 bg-green-50",
  group_updated: "text-amber-600 bg-amber-50",
  member_added: "text-green-600 bg-green-50",
  member_removed: "text-red-600 bg-red-50",
};

const PAGE_SIZE = 20;

export function ShareActivityLog({
  meetingId,
  entityType,
  showTitle = true,
}: ShareActivityLogProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchEntries = async (currentOffset: number, append = false) => {
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);

    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(currentOffset),
    });
    if (meetingId) params.set("entity_id", meetingId);
    if (entityType) params.set("entity_type", entityType);

    try {
      const res = await fetch(`/api/share/activity?${params}`);
      if (!res.ok) return;

      const data = await res.json();
      const newEntries: ActivityEntry[] = data.entries ?? [];
      setHasMore(newEntries.length === PAGE_SIZE);

      if (append) {
        setEntries((prev) => [...prev, ...newEntries]);
      } else {
        setEntries(newEntries);
      }
    } finally {
      if (append) setIsLoadingMore(false);
      else setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, entityType]);

  const handleLoadMore = async () => {
    const nextOffset = offset + PAGE_SIZE;
    setOffset(nextOffset);
    await fetchEntries(nextOffset, true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showTitle && (
        <h4 className="text-sm font-medium">Share History</h4>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No sharing activity yet.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  ACTION_COLORS[entry.action] ?? "text-muted-foreground bg-muted"
                }`}
              >
                {ACTION_ICONS[entry.action] ?? "•"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug">{describeAction(entry)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(entry.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={handleLoadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <ChevronDown className="h-3 w-3 mr-1" />
          )}
          Load more
        </Button>
      )}
    </div>
  );
}
