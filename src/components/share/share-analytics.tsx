"use client";

import { useEffect, useState } from "react";
import { Eye, Users, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ShareAnalytics } from "@/types/share";

interface ShareAnalyticsProps {
  meetingId: string;
  variant?: "badge" | "full";
}

export function ShareAnalyticsBadge({ meetingId, variant = "badge" }: ShareAnalyticsProps) {
  const [analytics, setAnalytics] = useState<ShareAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`/api/share/${meetingId}/analytics`);
        if (response.ok) {
          const data = await response.json();
          setAnalytics(data.analytics);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [meetingId]);

  if (isLoading || !analytics) {
    return null;
  }

  if (variant === "badge") {
    if (analytics.total_views === 0) {
      return null;
    }

    return (
      <Badge variant="secondary" className="text-xs">
        <Eye className="h-3 w-3 mr-1" />
        {analytics.total_views} view{analytics.total_views !== 1 ? "s" : ""}
      </Badge>
    );
  }

  // Full variant
  return (
    <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
      <h4 className="text-sm font-medium">Share Analytics</h4>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-background rounded-md">
            <Eye className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-lg font-semibold">{analytics.total_views}</p>
            <p className="text-xs text-muted-foreground">Total Views</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-2 bg-background rounded-md">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-lg font-semibold">{analytics.unique_visitors}</p>
            <p className="text-xs text-muted-foreground">Unique Visitors</p>
          </div>
        </div>
      </div>

      {analytics.last_view && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            Last viewed{" "}
            {new Date(analytics.last_view).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </div>
      )}
    </div>
  );
}

// Alias for convenience
export { ShareAnalyticsBadge as ShareAnalytics };
