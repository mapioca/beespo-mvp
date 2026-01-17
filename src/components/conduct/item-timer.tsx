"use client";

import { useEffect } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimerProgress, InlineTimer } from "./timer-progress";
import { useItemTimer, useTimerControls } from "@/hooks/use-timer";
import { cn } from "@/lib/utils";

interface ItemTimerProps {
  meetingId: string;
  itemId: string;
  allocatedMinutes: number | null;
  size?: "sm" | "md" | "lg";
  showControls?: boolean;
  className?: string;
}

export function ItemTimer({
  meetingId,
  itemId,
  allocatedMinutes,
  size = "lg",
  showControls = true,
  className,
}: ItemTimerProps) {
  const timerState = useItemTimer(itemId);
  const {
    handleStartItem,
    handlePauseItem,
    handleResetItem,
    handleInitItem,
  } = useTimerControls(meetingId);

  // Initialize timer when component mounts
  useEffect(() => {
    handleInitItem(itemId, allocatedMinutes);
  }, [itemId, allocatedMinutes, handleInitItem]);

  const isRunning = timerState.status === "running";
  const isPaused = timerState.status === "paused";
  const hasStarted = timerState.elapsedSeconds > 0;

  const handleToggle = () => {
    if (isRunning) {
      handlePauseItem(itemId, timerState.elapsedSeconds, timerState.timeLogId);
    } else {
      handleStartItem(itemId);
    }
  };

  const handleReset = () => {
    handleResetItem(itemId);
  };

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <TimerProgress
        elapsedSeconds={timerState.elapsedSeconds}
        allocatedSeconds={timerState.allocatedSeconds}
        size={size}
      />

      {showControls && (
        <div className="flex items-center gap-2">
          <Button
            variant={isRunning ? "outline" : "default"}
            size="sm"
            onClick={handleToggle}
            className="gap-2"
          >
            {isRunning ? (
              <>
                <Pause className="h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                {hasStarted ? "Resume" : "Start"}
              </>
            )}
          </Button>

          {(isPaused || hasStarted) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Compact inline timer for sidebar/scribe view
interface CompactItemTimerProps {
  meetingId: string;
  itemId: string;
  allocatedMinutes: number | null;
  className?: string;
}

export function CompactItemTimer({
  meetingId,
  itemId,
  allocatedMinutes,
  className,
}: CompactItemTimerProps) {
  const timerState = useItemTimer(itemId);
  const {
    handleStartItem,
    handlePauseItem,
    handleInitItem,
  } = useTimerControls(meetingId);

  // Initialize timer when component mounts
  useEffect(() => {
    handleInitItem(itemId, allocatedMinutes);
  }, [itemId, allocatedMinutes, handleInitItem]);

  const isRunning = timerState.status === "running";

  const handleToggle = () => {
    if (isRunning) {
      handlePauseItem(itemId, timerState.elapsedSeconds, timerState.timeLogId);
    } else {
      handleStartItem(itemId);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <InlineTimer
        elapsedSeconds={timerState.elapsedSeconds}
        allocatedSeconds={timerState.allocatedSeconds}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={handleToggle}
      >
        {isRunning ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}
