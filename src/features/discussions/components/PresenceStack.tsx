"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { AppUser } from "../data/types";
import { Avatar } from "./shared";

export function PresenceStack({ users, className }: { users: AppUser[]; className?: string }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setTick((value) => value + 1), 4500);
    return () => window.clearInterval(interval);
  }, []);

  const live = users.filter((_, index) => (index + tick) % 4 !== 3).slice(0, 3);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--cp-success)/0.6)]" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[hsl(var(--cp-success))]" />
      </span>
      <div className="flex -space-x-1.5">
        {live.map((user) => (
          <span key={user.id} className="rounded-full ring-2 ring-background">
            <Avatar name={user.name} size={20} />
          </span>
        ))}
      </div>
      <span className="text-[11px] text-muted-foreground">
        {live.length} {live.length === 1 ? "person" : "people"} viewing
      </span>
    </div>
  );
}
