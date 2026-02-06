"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { ColumnTypePicker } from "@/components/tables";
import { createTable } from "@/lib/actions/table-actions";
import { useToast } from "@/lib/hooks/use-toast";
import type { ColumnType, CreateColumnRequest } from "@/types/table-types";

interface ColumnDraft {
  id: string;
  name: string;
  type: ColumnType;
}

export function TableBuilder() {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [columns, setColumns] = useState<ColumnDraft[]>([
    { id: crypto.randomUUID(), name: "Name", type: "text" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddColumn = () => {
    setColumns([
      ...columns,
      {
        id: crypto.randomUUID(),
        name: `Column ${columns.length + 1}`,
        type: "text",
      },
    ]);
  };

  const handleRemoveColumn = (id: string) => {
    if (columns.length === 1) {
      toast({
        title: "Cannot remove",
        description: "Table must have at least one column",
        variant: "destructive",
      });
      return;
    }
    setColumns(columns.filter((c) => c.id !== id));
  };

  const handleUpdateColumn = (id: string, updates: Partial<ColumnDraft>) => {
    setColumns(
      columns.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the table",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const columnRequests: CreateColumnRequest[] = columns.map((col, index) => ({
      name: col.name,
      type: col.type,
      position: index + 1,
    }));

    const result = await createTable({
      name: name.trim(),
      description: description.trim() || undefined,
      columns: columnRequests,
    });

    if (result.error) {
      toast({
        title: "Failed to create table",
        description: result.error,
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    toast({
      title: "Table created",
      description: `"${name}" has been created successfully`,
    });

    router.push(`/tables/${result.data?.id}`);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Create New Table</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Table name */}
          <div className="space-y-2">
            <Label htmlFor="name">Table Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Projects, Contacts, Inventory"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this table for?"
              rows={2}
            />
          </div>

          {/* Columns */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Columns</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddColumn}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Column
              </Button>
            </div>

            <div className="space-y-2">
              {columns.map((column) => (
                <div
                  key={column.id}
                  className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />

                  <Input
                    value={column.name}
                    onChange={(e) =>
                      handleUpdateColumn(column.id, { name: e.target.value })
                    }
                    placeholder="Column name"
                    className="flex-1"
                  />

                  <ColumnTypePicker
                    value={column.type}
                    onChange={(type) =>
                      handleUpdateColumn(column.id, { type })
                    }
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveColumn(column.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Table"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
