"use client";

import { useCallback, useRef } from "react";
import { useTablesStore } from "@/stores/tables-store";
import { updateCell } from "@/lib/actions/table-actions";
import { useToast } from "@/lib/hooks/use-toast";

/**
 * Hook to manage inline cell editing with optimistic updates
 */
export function useInlineEditing(tableId: string) {
  const {
    editingCell,
    setEditingCell,
    updateCell: updateCellInStore,
    queueCellUpdate,
    completeCellUpdate,
    revertCellUpdate,
    rows,
  } = useTablesStore();

  const { toast } = useToast();
  const pendingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Start editing a cell
   */
  const startEditing = useCallback(
    (rowId: string, columnId: string) => {
      setEditingCell({ rowId, columnId });
    },
    [setEditingCell]
  );

  /**
   * Stop editing
   */
  const stopEditing = useCallback(() => {
    setEditingCell(null);
  }, [setEditingCell]);

  /**
   * Save cell value with optimistic update and debounced server sync
   */
  const saveCell = useCallback(
    async (rowId: string, columnId: string, value: unknown) => {
      const key = `${rowId}:${columnId}`;

      // Get previous value for rollback
      const row = rows.find((r) => r.id === rowId);
      const previousValue = row?.data[columnId];

      // Cancel any pending save for this cell
      const existingTimeout = pendingTimeouts.current.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Optimistic update
      updateCellInStore(rowId, columnId, value);
      queueCellUpdate(rowId, columnId, value, previousValue);

      // Debounce server update
      const timeout = setTimeout(async () => {
        try {
          const result = await updateCell(tableId, rowId, columnId, value);

          if (result.error) {
            // Revert on error
            revertCellUpdate(key);
            toast({
              title: "Failed to save",
              description: result.error,
              variant: "destructive",
            });
          } else {
            completeCellUpdate(key);
          }
        } catch {
          revertCellUpdate(key);
          toast({
            title: "Failed to save",
            description: "Network error occurred",
            variant: "destructive",
          });
        }

        pendingTimeouts.current.delete(key);
      }, 500); // 500ms debounce

      pendingTimeouts.current.set(key, timeout);
    },
    [tableId, rows, updateCellInStore, queueCellUpdate, completeCellUpdate, revertCellUpdate, toast]
  );

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, rowId: string, columnId: string, columns: { id: string }[], rowIds: string[]) => {
      const currentRowIndex = rowIds.indexOf(rowId);
      const currentColIndex = columns.findIndex((c) => c.id === columnId);

      switch (e.key) {
        case "Tab":
          e.preventDefault();
          // Move to next/previous cell
          if (e.shiftKey) {
            // Previous cell
            if (currentColIndex > 0) {
              startEditing(rowId, columns[currentColIndex - 1].id);
            } else if (currentRowIndex > 0) {
              startEditing(rowIds[currentRowIndex - 1], columns[columns.length - 1].id);
            }
          } else {
            // Next cell
            if (currentColIndex < columns.length - 1) {
              startEditing(rowId, columns[currentColIndex + 1].id);
            } else if (currentRowIndex < rowIds.length - 1) {
              startEditing(rowIds[currentRowIndex + 1], columns[0].id);
            }
          }
          break;

        case "Enter":
          if (!e.shiftKey) {
            e.preventDefault();
            // Move to next row
            if (currentRowIndex < rowIds.length - 1) {
              startEditing(rowIds[currentRowIndex + 1], columnId);
            } else {
              stopEditing();
            }
          }
          break;

        case "Escape":
          e.preventDefault();
          stopEditing();
          break;

        case "ArrowUp":
          if (e.altKey || e.metaKey) {
            e.preventDefault();
            if (currentRowIndex > 0) {
              startEditing(rowIds[currentRowIndex - 1], columnId);
            }
          }
          break;

        case "ArrowDown":
          if (e.altKey || e.metaKey) {
            e.preventDefault();
            if (currentRowIndex < rowIds.length - 1) {
              startEditing(rowIds[currentRowIndex + 1], columnId);
            }
          }
          break;

        case "ArrowLeft":
          if (e.altKey || e.metaKey) {
            e.preventDefault();
            if (currentColIndex > 0) {
              startEditing(rowId, columns[currentColIndex - 1].id);
            }
          }
          break;

        case "ArrowRight":
          if (e.altKey || e.metaKey) {
            e.preventDefault();
            if (currentColIndex < columns.length - 1) {
              startEditing(rowId, columns[currentColIndex + 1].id);
            }
          }
          break;
      }
    },
    [startEditing, stopEditing]
  );

  return {
    editingCell,
    startEditing,
    stopEditing,
    saveCell,
    handleKeyDown,
    isEditing: (rowId: string, columnId: string) =>
      editingCell?.rowId === rowId && editingCell?.columnId === columnId,
  };
}
