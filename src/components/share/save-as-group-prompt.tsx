"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SaveAsGroupPromptProps {
  recipientCount: number;
  onSave: (groupName: string) => Promise<void>;
}

export function SaveAsGroupPrompt({
  recipientCount,
  onSave,
}: SaveAsGroupPromptProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!groupName.trim()) return;
    setIsSaving(true);
    try {
      await onSave(groupName.trim());
      setIsExpanded(false);
      setGroupName("");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isExpanded) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
        <span className="text-muted-foreground">
          💡 Save these {recipientCount} recipients as a group?
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs ml-auto"
          onClick={() => setIsExpanded(true)}
        >
          Save as Group
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
      <Input
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        placeholder="Group name..."
        className="h-7 text-sm flex-1"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setIsExpanded(false);
        }}
        autoFocus
        disabled={isSaving}
      />
      <Button
        size="sm"
        className="h-7 text-xs"
        onClick={handleSave}
        disabled={!groupName.trim() || isSaving}
      >
        {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        onClick={() => setIsExpanded(false)}
        disabled={isSaving}
      >
        Cancel
      </Button>
    </div>
  );
}
