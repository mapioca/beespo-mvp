"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MemberSearchInput } from "./member-search-input";
import type { SharingGroupWithMembers } from "@/types/share";

interface WorkspaceMember {
  email: string;
  full_name: string | null;
}

interface SharingGroupFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present for edit mode, absent for create mode */
  group?: SharingGroupWithMembers;
  workspaceMembers: WorkspaceMember[];
  onSave: (data: {
    name: string;
    description: string;
    memberEmails: string[];
  }) => Promise<void>;
}

export function SharingGroupForm({
  open,
  onOpenChange,
  group,
  workspaceMembers,
  onSave,
}: SharingGroupFormProps) {
  const isEditMode = Boolean(group);

  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [memberEmails, setMemberEmails] = useState<string[]>(
    group?.members.map((m) => m.email) ?? []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Reset form when dialog opens with fresh state
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset to initial state when closing
      setTimeout(() => {
        setName(group?.name ?? "");
        setDescription(group?.description ?? "");
        setMemberEmails(group?.members.map((m) => m.email) ?? []);
        setNameError(null);
      }, 150);
    }
    onOpenChange(open);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError("Group name is required");
      return;
    }
    setNameError(null);
    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        memberEmails,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Sharing Group" : "New Sharing Group"}
            </DialogTitle>
            <DialogDescription>
              Groups let you share meetings with multiple people at once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Group Name */}
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(null);
                }}
                placeholder="e.g. Stake Leadership"
                disabled={isSaving}
                autoFocus
              />
              {nameError && (
                <p className="text-sm text-destructive">{nameError}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="group-description">
                Description{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="group-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. All bishops and stake presidency"
                disabled={isSaving}
                rows={2}
              />
            </div>

            {/* Members */}
            <div className="space-y-2">
              <Label>Members</Label>
              <MemberSearchInput
                members={memberEmails}
                workspaceMembers={workspaceMembers}
                onAdd={(email) => setMemberEmails((prev) => [...prev, email])}
                onRemove={(email) =>
                  setMemberEmails((prev) => prev.filter((e) => e !== email))
                }
                disabled={isSaving}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              External emails will receive view or edit links when meetings are
              shared.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {isEditMode ? "Save Changes" : "Create Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
