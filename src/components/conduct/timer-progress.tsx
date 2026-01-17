"use client";

import { cn } from "@/lib/utils";
import { getTimerColor, formatTime, getRemainingTime } from "@/stores/conduct-meeting-store";

interface TimerProgressProps {
  elapsedSeconds: number;
  allocatedSeconds: number | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const sizes = {
  sm: { ring: 48, stroke: 3, textClass: "text-xs" },
  md: { ring: 80, stroke: 4, textClass: "text-lg" },
  lg: { ring: 120, stroke: 6, textClass: "text-2xl" },
};

export function TimerProgress({
  elapsedSeconds,
  allocatedSeconds,
  size = "md",
  showLabel = true,
  className,
}: TimerProgressProps) {
  const { ring, stroke, textClass } = sizes[size];
  const radius = (ring - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate progress
  const isCountdown = allocatedSeconds !== null && allocatedSeconds > 0;
  const progress = isCountdown
    ? Math.min(1, elapsedSeconds / allocatedSeconds)
    : 0;
  const offset = circumference - progress * circumference;

  // Get color based on progress
  const color = getTimerColor(elapsedSeconds, allocatedSeconds);
  const colorClasses = {
    green: "stroke-green-500",
    yellow: "stroke-yellow-500",
    red: "stroke-red-500",
  };

  // Format display time
  const displayTime = isCountdown
    ? formatTime(getRemainingTime(elapsedSeconds, allocatedSeconds))
    : formatTime(elapsedSeconds);

  // For countdown mode, show negative when over time
  const isOvertime = isCountdown && elapsedSeconds > allocatedSeconds;
  const overtimeSeconds = isOvertime ? elapsedSeconds - allocatedSeconds : 0;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={ring}
        height={ring}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={ring / 2}
          cy={ring / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted-foreground/20"
        />
        {/* Progress circle */}
        {isCountdown && (
          <circle
            cx={ring / 2}
            cy={ring / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={isOvertime ? 0 : offset}
            strokeLinecap="round"
            className={cn(
              "transition-all duration-300",
              colorClasses[color]
            )}
          />
        )}
      </svg>

      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "font-mono font-bold tabular-nums",
              textClass,
              isOvertime && "text-red-500"
            )}
          >
            {isOvertime ? `+${formatTime(overtimeSeconds)}` : displayTime}
          </span>
          {size !== "sm" && isCountdown && (
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {isOvertime ? "overtime" : "remaining"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Simplified version for inline use
interface InlineTimerProps {
  elapsedSeconds: number;
  allocatedSeconds: number | null;
  className?: string;
}

export function InlineTimer({ elapsedSeconds, allocatedSeconds, className }: InlineTimerProps) {
  const color = getTimerColor(elapsedSeconds, allocatedSeconds);
  const isCountdown = allocatedSeconds !== null && allocatedSeconds > 0;
  const isOvertime = isCountdown && elapsedSeconds > allocatedSeconds;

  const displayTime = isCountdown
    ? isOvertime
      ? `+${formatTime(elapsedSeconds - allocatedSeconds)}`
      : formatTime(getRemainingTime(elapsedSeconds, allocatedSeconds))
    : formatTime(elapsedSeconds);

  const colorClasses = {
    green: "text-green-500",
    yellow: "text-yellow-500",
    red: "text-red-500",
  };

  return (
    <span
      className={cn(
        "font-mono font-semibold tabular-nums",
        colorClasses[color],
        className
      )}
    >
      {displayTime}
    </span>
  );
}
