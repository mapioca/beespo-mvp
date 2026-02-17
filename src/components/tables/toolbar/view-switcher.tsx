"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, Plus, Check, Trash2 } from "lucide-react";
import { useTablesStore, useActiveView } from "@/stores/tables-store";
import { createView, deleteView } from "@/lib/actions/table-actions";
import { toast } from "@/lib/toast";
import type { TableView } from "@/types/table-types";

interface ViewSwitcherProps {
  tableId: string;
  views: TableView[];
  onSave?: () => void;
}

export function ViewSwitcher({ tableId, views, onSave }: ViewSwitcherProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const {
    filters,
    sorts,
    visibleColumnIds,
    columnWidths,
    applyView,
    addView,
    removeView,
  } = useTablesStore();

  const activeView = useActiveView();

  const handleSelectView = (view: TableView) => {
    applyView(view);
  };

  const handleSaveView = async () => {
    if (!newViewName.trim()) return;

    setIsSaving(true);

    const result = await createView(tableId, {
      name: newViewName.trim(),
      filters,
      sorts,
      visible_columns: visibleColumnIds,
      column_widths: columnWidths,
    });

    if (result.error) {
      toast.error("Failed to save view", { description: result.error });
    } else if (result.data) {
      addView(result.data);
      applyView(result.data);
      setSaveDialogOpen(false);
      setNewViewName("");
      toast.success("View saved", { description: `"${newViewName}" has been saved` });
      onSave?.();
    }

    setIsSaving(false);
  };

  const handleDeleteView = async (view: TableView) => {
    if (view.is_default) {
      toast.error("Cannot delete", { description: "Cannot delete the default view" });
      return;
    }

    const result = await deleteView(tableId, view.id);

    if (result.error) {
      toast.error("Failed to delete view", { description: result.error });
    } else {
      removeView(view.id);
      toast.success("View deleted");
    }
  };


  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {activeView?.name || "All"}
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {views.map((view) => (
            <DropdownMenuItem
              key={view.id}
              className="flex items-center justify-between"
              onClick={() => handleSelectView(view)}
            >
              <span className="flex items-center gap-2">
                {view.id === activeView?.id && (
                  <Check className="h-4 w-4" />
                )}
                {view.id !== activeView?.id && <div className="w-4" />}
                {view.name}
                {view.is_default && (
                  <span className="text-xs text-muted-foreground">(default)</span>
                )}
              </span>
              {!view.is_default && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteView(view);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setSaveDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Save current view
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save View Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save View</DialogTitle>
            <DialogDescription>
              Save the current filters, sorts, and column settings as a reusable view.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="viewName">View name</Label>
              <Input
                id="viewName"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="e.g., Active Tasks, This Month"
              />
            </div>

            <div className="text-sm text-muted-foreground">
              <p>This view will include:</p>
              <ul className="list-disc list-inside mt-1">
                <li>{filters.length} filter(s)</li>
                <li>{sorts.length} sort(s)</li>
                <li>{visibleColumnIds.length} visible column(s)</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveView} disabled={isSaving || !newViewName.trim()}>
              {isSaving ? "Saving..." : "Save View"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
