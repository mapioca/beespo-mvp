"use client";

import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConductMeetingStore, formatTime } from "@/stores/conduct-meeting-store";
import { createTimestampBlock } from "@/lib/conduct/notes-service";
import type { OutputData } from "@editorjs/editorjs";

interface TimestampButtonProps {
  onInsert: (block: OutputData["blocks"][0]) => void;
  className?: string;
}

export function TimestampButton({ onInsert, className }: TimestampButtonProps) {
  const { globalTimer } = useConductMeetingStore();

  const handleClick = () => {
    const block = createTimestampBlock(globalTimer.elapsedSeconds);
    onInsert(block);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className={className}
    >
      <Clock className="h-4 w-4 mr-2" />
      Insert Timestamp ({formatTime(globalTimer.elapsedSeconds)})
    </Button>
  );
}
