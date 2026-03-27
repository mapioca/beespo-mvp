"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { ShareRecipient, SharePermission } from "@/types/share";

interface SharingWithListProps {
  recipients: ShareRecipient[];
  onRemove: (id: string) => void;
  onPermissionChange: (id: string, permission: SharePermission) => void;
  disabled?: boolean;
}

export function SharingWithList({
  recipients,
  onRemove,
  onPermissionChange,
  disabled = false,
}: SharingWithListProps) {
  if (recipients.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Sharing With
      </p>
      {recipients.map((recipient) => (
        <div
          key={recipient.id}
          className="flex items-center gap-2 rounded-md border px-3 py-2"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium truncate">
                {recipient.label}
              </span>
              {recipient.type === "group" && recipient.group && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {recipient.group.member_count}{" "}
                  {recipient.group.member_count === 1 ? "member" : "members"}
                </Badge>
              )}
            </div>
          </div>

          <Select
            value={recipient.permission}
            onValueChange={(v: SharePermission) =>
              onPermissionChange(recipient.id, v)
            }
            disabled={disabled}
          >
            <SelectTrigger className="h-7 w-[90px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">Viewer</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => onRemove(recipient.id)}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
