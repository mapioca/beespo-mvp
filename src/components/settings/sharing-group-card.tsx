"use client";

import { useState } from "react";
import { Pencil, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { SharingGroupWithMembers } from "@/types/share";

interface SharingGroupCardProps {
  group: SharingGroupWithMembers;
  canManage: boolean;
  onEdit: (group: SharingGroupWithMembers) => void;
  onDelete: (group: SharingGroupWithMembers) => void;
}

export function SharingGroupCard({
  group,
  canManage,
  onEdit,
  onDelete,
}: SharingGroupCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 shrink-0 rounded-md bg-muted p-1.5">
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{group.name}</p>
            {group.description && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {group.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {group.member_count}{" "}
              {group.member_count === 1 ? "member" : "members"}
            </p>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-1 shrink-0 ml-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(group)}
              title="Edit group"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setShowDeleteDialog(true)}
              title="Delete group"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{group.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Deleting this group will revoke access to all meetings that were
              shared via this group. Members will no longer be able to view or
              edit those meetings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setShowDeleteDialog(false);
                onDelete(group);
              }}
            >
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
