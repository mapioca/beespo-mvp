"use client";

import { useState } from "react";
import { ChevronDown, User, Calendar, Clock, FileText, Hash } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface CollapsibleDetailsProps {
  templateName?: string | null;
  createdByName?: string | null;
  meetingId: string;
  scheduledDate: string;
  totalDuration: number;
  defaultOpen?: boolean;
}

export function CollapsibleDetails({
  templateName,
  createdByName,
  meetingId,
  scheduledDate,
  totalDuration,
  defaultOpen = true,
}: CollapsibleDetailsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const formattedDate = format(new Date(scheduledDate), "MMM d, yyyy");
  const formattedTime = format(new Date(scheduledDate), "h:mm a");

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "flex items-center justify-between w-full py-2 px-1 text-sm font-semibold",
            "hover:bg-muted/50 rounded-md transition-colors -mx-1"
          )}
        >
          <span className="text-muted-foreground uppercase tracking-wider text-xs">
            Details
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Template */}
        <div className="flex items-start gap-3">
          <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <span className="text-xs text-muted-foreground block">Template</span>
            <span className="text-sm font-medium">
              {templateName || "No Template"}
            </span>
          </div>
        </div>

        {/* Scheduled Date */}
        <div className="flex items-start gap-3">
          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <span className="text-xs text-muted-foreground block">Scheduled</span>
            <span className="text-sm font-medium">
              {formattedDate} at {formattedTime}
            </span>
          </div>
        </div>

        {/* Duration */}
        <div className="flex items-start gap-3">
          <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <span className="text-xs text-muted-foreground block">Est. Duration</span>
            <span className="text-sm font-medium">
              {totalDuration} minutes
            </span>
          </div>
        </div>

        {/* Created By */}
        <div className="flex items-start gap-3">
          <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <span className="text-xs text-muted-foreground block">Created By</span>
            <span className="text-sm font-medium">
              {createdByName || "Unknown"}
            </span>
          </div>
        </div>

        {/* Meeting ID */}
        <div className="flex items-start gap-3">
          <Hash className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <span className="text-xs text-muted-foreground block">Meeting ID</span>
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
              {meetingId.slice(0, 8)}
            </code>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
