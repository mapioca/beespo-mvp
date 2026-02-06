"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getDeletedColumns, restoreColumn } from "@/lib/actions/table-actions";
import { useTablesStore } from "@/stores/tables-store";
import { useToast } from "@/lib/hooks/use-toast";
import type { Column } from "@/types/table-types";

interface RecoverColumnDialogProps {
  tableId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecoverColumnDialog({
  tableId,
  open,
  onOpenChange,
}: RecoverColumnDialogProps) {
  const { toast } = useToast();
  const { addColumn } = useTablesStore();

  const [deletedColumns, setDeletedColumns] = useState<Column[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchDeletedColumns();
    }
  }, [open, tableId]);

  const fetchDeletedColumns = async () => {
    setIsLoading(true);
    const result = await getDeletedColumns(tableId);
    if (result.data) {
      setDeletedColumns(result.data);
    }
    setIsLoading(false);
  };

  const handleRestore = async (column: Column) => {
    setRestoringId(column.id);

    const result = await restoreColumn(tableId, column.id);

    if (result.error) {
      toast({
        title: "Failed to restore column",
        description: result.error,
        variant: "destructive",
      });
    } else if (result.data) {
      addColumn(result.data);
      setDeletedColumns(deletedColumns.filter((c) => c.id !== column.id));
      toast({
        title: "Column restored",
        description: `"${column.name}" has been restored`,
      });
    }

    setRestoringId(null);
  };

  const getDaysRemaining = (deletedAt: string): number => {
    const deleted = new Date(deletedAt);
    const expiresAt = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Recover Deleted Columns</DialogTitle>
          <DialogDescription>
            Restore columns that were deleted within the last 30 days
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : deletedColumns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No deleted columns to recover</p>
            </div>
          ) : (
            <div className="space-y-2">
              {deletedColumns.map((column) => {
                const daysRemaining = getDaysRemaining(column.deleted_at!);
                return (
                  <div
                    key={column.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{column.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Deleted {formatDistanceToNow(new Date(column.deleted_at!))} ago
                        {" • "}
                        <span className={daysRemaining <= 7 ? "text-destructive" : ""}>
                          {daysRemaining} days remaining
                        </span>
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(column)}
                      disabled={restoringId === column.id}
                    >
                      {restoringId === column.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        "Restore"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
