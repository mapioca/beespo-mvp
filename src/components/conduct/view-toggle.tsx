"use client";

import { Monitor, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConductMeetingStore, ViewMode } from "@/stores/conduct-meeting-store";

interface ViewToggleProps {
  className?: string;
}

export function ViewToggle({ className }: ViewToggleProps) {
  const { viewMode, setViewMode } = useConductMeetingStore();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg bg-muted p-1 text-muted-foreground",
        className
      )}
    >
      <ViewToggleButton
        mode="conductor"
        currentMode={viewMode}
        onClick={() => setViewMode("conductor")}
        icon={<Monitor className="h-4 w-4" />}
        label="Conductor"
      />
      <ViewToggleButton
        mode="scribe"
        currentMode={viewMode}
        onClick={() => setViewMode("scribe")}
        icon={<PenLine className="h-4 w-4" />}
        label="Scribe"
      />
    </div>
  );
}

interface ViewToggleButtonProps {
  mode: ViewMode;
  currentMode: ViewMode;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function ViewToggleButton({
  mode,
  currentMode,
  onClick,
  icon,
  label,
}: ViewToggleButtonProps) {
  const isActive = mode === currentMode;

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "hover:bg-background/50 hover:text-foreground"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
