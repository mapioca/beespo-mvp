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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Folder, FolderOpen } from "lucide-react";

type TemplateFolder = {
  id: string;
  workspace_id: string;
  name: string;
  order_index: number;
  created_at: string;
  updated_at: string;
};

interface MoveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string | null;
  templateName: string;
  currentFolderId: string | null;
  folders: TemplateFolder[];
  onMoveTemplate: (templateId: string, folderId: string | null) => Promise<void>;
}

export function MoveTemplateDialog({
  open,
  onOpenChange,
  templateId,
  templateName,
  currentFolderId,
  folders,
  onMoveTemplate,
}: MoveTemplateDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
    currentFolderId
  );
  const [moving, setMoving] = useState(false);

  const handleMove = async () => {
    if (!templateId || selectedFolderId === currentFolderId) return;

    setMoving(true);
    try {
      await onMoveTemplate(templateId, selectedFolderId);
      onOpenChange(false);
    } catch (error) {
      console.error("Error moving template:", error);
    } finally {
      setMoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move Template</DialogTitle>
          <DialogDescription>
            Move <strong>{templateName}</strong> to a different folder or to the root
            level.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="folder-select">Destination</Label>
            <Select
              value={selectedFolderId || "root"}
              onValueChange={(value) =>
                setSelectedFolderId(value === "root" ? null : value)
              }
            >
              <SelectTrigger id="folder-select">
                <SelectValue placeholder="Select a folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    Root (No Folder)
                  </div>
                </SelectItem>
                {folders
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4" />
                        {folder.name}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={moving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={moving || selectedFolderId === currentFolderId}
          >
            {moving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Moving...
              </>
            ) : (
              "Move Template"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
