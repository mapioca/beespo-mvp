"use client";

import { useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { InlineInput } from "@/components/meetings/editable/inline-input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { Database } from "@/types/database";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface CollapsibleDetailsProps {
  meeting: Meeting;
  isEditable: boolean;
  onMeetingUpdate: React.Dispatch<React.SetStateAction<Meeting>>;
  defaultOpen?: boolean;
}

export function CollapsibleDetails({
  meeting,
  isEditable,
  onMeetingUpdate,
  defaultOpen = true,
}: CollapsibleDetailsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const createFieldSaver = useCallback(
    (field: string, transform?: (v: string) => unknown) => {
      return async (value: string): Promise<boolean> => {
        const dbValue = transform ? transform(value) : value || null;
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("meetings") as any)
          .update({ [field]: dbValue })
          .eq("id", meeting.id);
        if (error) {
          toast.error("Save failed", {
            description: `Could not update ${field.replace(/_/g, " ")}.`,
          });
          return false;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onMeetingUpdate((prev: any) => ({ ...prev, [field]: dbValue }));
        return true;
      };
    },
    [meeting.id, onMeetingUpdate]
  );

  const numberTransform = (v: string) => {
    const num = parseInt(v, 10);
    return isNaN(num) ? null : num;
  };

  const editableFields = [
    {
      key: "presiding_name",
      label: "Presiding",
      type: "text" as const,
      emptyText: "Not assigned",
      value: meeting.presiding_name || "",
    },
    {
      key: "conducting_name",
      label: "Conducting",
      type: "text" as const,
      emptyText: "Not assigned",
      value: meeting.conducting_name || "",
    },
    {
      key: "chorister_name",
      label: "Chorister",
      type: "text" as const,
      emptyText: "Not assigned",
      value: meeting.chorister_name || "",
    },
    {
      key: "organist_name",
      label: "Organist/Pianist",
      type: "text" as const,
      emptyText: "Not assigned",
      value: meeting.organist_name || "",
    },
    {
      key: "attendance_count",
      label: "Attendance",
      type: "number" as const,
      emptyText: "Not recorded",
      value:
        meeting.attendance_count != null
          ? String(meeting.attendance_count)
          : "",
    },
  ];

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
        {/* Editable role/attendance fields */}
        {editableFields.map((field) => (
          <div key={field.key}>
            <span className="text-xs text-muted-foreground block">
              {field.label}
            </span>
            <InlineInput
              value={field.value}
              onSave={createFieldSaver(
                field.key,
                field.type === "number" ? numberTransform : undefined
              )}
              type={field.type}
              disabled={!isEditable}
              emptyText={field.emptyText}
              placeholder={field.emptyText}
              min={field.type === "number" ? 0 : undefined}
            />
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
