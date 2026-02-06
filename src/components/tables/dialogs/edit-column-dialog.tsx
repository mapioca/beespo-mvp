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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { ColumnTypePicker } from "@/components/tables";
import { ColumnConfigPanel } from "@/components/tables";
import { updateColumn, validateTypeChange } from "@/lib/actions/table-actions";
import { useTablesStore } from "@/stores/tables-store";
import { useToast } from "@/lib/hooks/use-toast";
import type { Column, ColumnType, ColumnConfig } from "@/types/table-types";

interface EditColumnDialogProps {
  tableId: string;
  column: Column | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditColumnDialog({
  tableId,
  column,
  open,
  onOpenChange,
}: EditColumnDialogProps) {
  const { toast } = useToast();
  const { updateColumn: updateColumnInStore } = useTablesStore();

  const [name, setName] = useState("");
  const [type, setType] = useState<ColumnType>("text");
  const [config, setConfig] = useState<ColumnConfig>({});
  const [isRequired, setIsRequired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [typeChangeWarning, setTypeChangeWarning] = useState<string | null>(null);
  const [canChangeType, setCanChangeType] = useState(true);

  useEffect(() => {
    if (column) {
      setName(column.name);
      setType(column.type);
      setConfig(column.config);
      setIsRequired(column.is_required);
      setTypeChangeWarning(null);
      setCanChangeType(true);
    }
  }, [column]);

  const handleTypeChange = async (newType: ColumnType) => {
    if (!column || newType === column.type) {
      setType(newType);
      setConfig({});
      setTypeChangeWarning(null);
      setCanChangeType(true);
      return;
    }

    // Validate type change
    const result = await validateTypeChange(tableId, column.id, newType);

    if (result.data) {
      if (!result.data.canChange) {
        setCanChangeType(false);
        setTypeChangeWarning(
          `Cannot change to ${newType}: ${result.data.invalidRowIds.length} row(s) have incompatible values. ${result.data.suggestions || ""}`
        );
        return;
      }

      if (result.data.warnings.length > 0) {
        setTypeChangeWarning(result.data.warnings.join(". "));
      } else {
        setTypeChangeWarning(null);
      }
    }

    setType(newType);
    setConfig({});
    setCanChangeType(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!column || !name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the column",
        variant: "destructive",
      });
      return;
    }

    if (!canChangeType && type !== column.type) {
      toast({
        title: "Cannot change type",
        description: "Please fix the incompatible values first",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const result = await updateColumn(tableId, column.id, {
      name: name.trim(),
      type,
      config,
      is_required: isRequired,
    });

    if (result.error) {
      toast({
        title: "Failed to update column",
        description: result.error,
        variant: "destructive",
      });
    } else if (result.data) {
      updateColumnInStore(column.id, result.data);
      toast({
        title: "Column updated",
        description: `"${name}" has been updated`,
      });
      onOpenChange(false);
    }

    setIsSubmitting(false);
  };

  if (!column) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Column</DialogTitle>
            <DialogDescription>
              Modify the column properties
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
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <ColumnTypePicker
                value={type}
                onChange={handleTypeChange}
              />
              {typeChangeWarning && (
                <Alert variant={canChangeType ? "default" : "destructive"}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{typeChangeWarning}</AlertDescription>
                </Alert>
              )}
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
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (!canChangeType && type !== column.type)}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
