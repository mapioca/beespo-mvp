"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface RenameFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string | null;
  currentName: string;
  onRenameFolder: (folderId: string, newName: string) => Promise<void>;
}

export function RenameFolderDialog({
  open,
  onOpenChange,
  folderId,
  currentName,
  onRenameFolder,
}: RenameFolderDialogProps) {
  const [folderName, setFolderName] = useState(currentName);
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    if (open) {
      setFolderName(currentName);
    }
  }, [open, currentName]);

  const handleRename = async () => {
    if (!folderName.trim() || !folderId || folderName === currentName) return;

    setRenaming(true);
    try {
      await onRenameFolder(folderId, folderName.trim());
      onOpenChange(false);
    } catch (error) {
      console.error("Error renaming folder:", error);
    } finally {
      setRenaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && folderName.trim() && folderName !== currentName) {
      handleRename();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Folder</DialogTitle>
          <DialogDescription>
            Enter a new name for this folder. Templates in this folder will not be
            affected.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              placeholder="e.g., Q1 2026 Meetings"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={renaming}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={renaming}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRename}
            disabled={renaming || !folderName.trim() || folderName === currentName}
          >
            {renaming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Renaming...
              </>
            ) : (
              "Rename Folder"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
