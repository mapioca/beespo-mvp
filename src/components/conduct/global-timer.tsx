"use client";

import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/stores/conduct-meeting-store";
import { useGlobalTimer, useTimerControls } from "@/hooks/use-timer";
import { cn } from "@/lib/utils";

interface GlobalTimerProps {
  meetingId: string;
  className?: string;
}

export function GlobalTimer({ meetingId, className }: GlobalTimerProps) {
  const globalTimer = useGlobalTimer();
  const { handleStartGlobal, handlePauseGlobal } = useTimerControls(meetingId);

  const isRunning = globalTimer.status === "running";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-2 text-sm">
        <span
          className={cn(
            "inline-block w-2 h-2 rounded-full",
            isRunning ? "bg-red-500 animate-pulse" : "bg-muted-foreground/50"
          )}
        />
        <span className="text-muted-foreground">
          {isRunning ? "Live" : "Paused"}
        </span>
        <span className="font-mono font-semibold tabular-nums">
          {formatTime(globalTimer.elapsedSeconds, true)}
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={isRunning ? handlePauseGlobal : handleStartGlobal}
      >
        {isRunning ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

// Compact version for header
interface CompactGlobalTimerProps {
  meetingId: string;
}

export function CompactGlobalTimer({ meetingId }: CompactGlobalTimerProps) {
  const globalTimer = useGlobalTimer();
  const { handleStartGlobal, handlePauseGlobal } = useTimerControls(meetingId);

  const isRunning = globalTimer.status === "running";

  return (
    <button
      onClick={isRunning ? handlePauseGlobal : handleStartGlobal}
      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <span
        className={cn(
          "inline-block w-2 h-2 rounded-full",
          isRunning ? "bg-red-500 animate-pulse" : "bg-muted-foreground/50"
        )}
      />
      <span>{isRunning ? "Live" : "Paused"}</span>
      <span className="font-mono tabular-nums">
        {formatTime(globalTimer.elapsedSeconds, false)} elapsed
      </span>
    </button>
  );
}
