"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { ColumnTypePicker } from "@/components/tables";
import { ColumnConfigPanel } from "@/components/tables";
import { createColumn } from "@/lib/actions/table-actions";
import { useTablesStore } from "@/stores/tables-store";
import { toast } from "@/lib/toast";
import type { ColumnType, ColumnConfig } from "@/types/table-types";

interface AddColumnDialogProps {
  tableId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddColumnDialog({
  tableId,
  open,
  onOpenChange,
}: AddColumnDialogProps) {
  const { addColumn } = useTablesStore();

  const [name, setName] = useState("");
  const [type, setType] = useState<ColumnType>("text");
  const [config, setConfig] = useState<ColumnConfig>({});
  const [isRequired, setIsRequired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name required", { description: "Please enter a name for the column" });
      return;
    }

    setIsSubmitting(true);

    const result = await createColumn(tableId, {
      name: name.trim(),
      type,
      config,
      is_required: isRequired,
    });

    if (result.error) {
      toast.error("Failed to add column", { description: result.error });
    } else if (result.data) {
      addColumn(result.data);
      toast.success("Column added", { description: `"${name}" has been added` });
      handleClose();
    }

    setIsSubmitting(false);
  };

  const handleClose = () => {
    setName("");
    setType("text");
    setConfig({});
    setIsRequired(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Column</DialogTitle>
            <DialogDescription>
              Add a new column to your table
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="columnName">Name</Label>
              <Input
                id="columnName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Column name"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <ColumnTypePicker
                value={type}
                onChange={(newType) => {
                  setType(newType);
                  setConfig({}); // Reset config when type changes
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isRequired">Required field</Label>
              <Switch
                id="isRequired"
                checked={isRequired}
                onCheckedChange={setIsRequired}
              />
            </div>

            {/* Type-specific configuration */}
            <ColumnConfigPanel
              type={type}
              config={config}
              onChange={setConfig}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Column"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
