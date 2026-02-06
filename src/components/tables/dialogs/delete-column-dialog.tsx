"use client";

import { useState } from "react";
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
import { deleteColumn } from "@/lib/actions/table-actions";
import { useTablesStore } from "@/stores/tables-store";
import { useToast } from "@/lib/hooks/use-toast";
import type { Column } from "@/types/table-types";

interface DeleteColumnDialogProps {
  tableId: string;
  column: Column | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteColumnDialog({
  tableId,
  column,
  open,
  onOpenChange,
}: DeleteColumnDialogProps) {
  const { toast } = useToast();
  const { removeColumn } = useTablesStore();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!column) return;

    setIsDeleting(true);

    const result = await deleteColumn(tableId, column.id);

    if (result.error) {
      toast({
        title: "Failed to delete column",
        description: result.error,
        variant: "destructive",
      });
    } else {
      removeColumn(column.id);
      toast({
        title: "Column deleted",
        description: `"${column.name}" has been deleted. You can restore it within 30 days.`,
      });
      onOpenChange(false);
    }

    setIsDeleting(false);
  };

  if (!column) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Column</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the column &ldquo;{column.name}&rdquo;?
            <br />
            <br />
            This will hide the column and its data. You can restore it within 30 days.
            After 30 days, the column and all its data will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete Column"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
