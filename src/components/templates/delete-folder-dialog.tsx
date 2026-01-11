"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";

interface DeleteFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string | null;
  folderName: string;
  templateCount: number;
  onDeleteFolder: (folderId: string) => Promise<void>;
}

export function DeleteFolderDialog({
  open,
  onOpenChange,
  folderId,
  folderName,
  templateCount,
  onDeleteFolder,
}: DeleteFolderDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!folderId) return;

    setDeleting(true);
    try {
      await onDeleteFolder(folderId);
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting folder:", error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Folder
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the folder <strong>{folderName}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {templateCount > 0 ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-sm text-blue-900">
              <p>
                This folder contains <strong>{templateCount}</strong> template
                {templateCount !== 1 ? "s" : ""}. The templates will be moved to the
                root level of Custom Templates and will not be deleted.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This folder is empty and will be permanently deleted.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Folder"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
