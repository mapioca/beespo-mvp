"use client";

import { useEffect, useCallback } from "react";
import { useTablesStore } from "@/stores/tables-store";
import { getTable, getTableRows } from "@/lib/actions/table-actions";

/**
 * Hook to fetch and manage table data
 */
export function useTableData(tableId: string | null) {
  const {
    setActiveTable,
    setColumns,
    setRows,
    setViews,
    setLoadingTable,
    setError,
    activeTable,
    columns,
    rows,
    views,
    isLoadingTable,
    error,
  } = useTablesStore();

  const fetchTable = useCallback(async () => {
    if (!tableId) {
      setActiveTable(null);
      setColumns([]);
      setRows([]);
      setViews([]);
      return;
    }

    setLoadingTable(true);
    setError(null);

    try {
      // Fetch table with columns and views
      const tableResult = await getTable(tableId);
      if (tableResult.error) {
        setError(tableResult.error);
        setLoadingTable(false);
        return;
      }

      if (tableResult.data) {
        setActiveTable(tableResult.data);
        setColumns(tableResult.data.columns || []);
        setViews(tableResult.data.views || []);
      }

      // Fetch rows
      const rowsResult = await getTableRows(tableId);
      if (rowsResult.data) {
        setRows(rowsResult.data);
      }

      setLoadingTable(false);
    } catch (err) {
      console.error("Error fetching table:", err);
      setError("Failed to load table");
      setLoadingTable(false);
    }
  }, [tableId, setActiveTable, setColumns, setRows, setViews, setLoadingTable, setError]);

  useEffect(() => {
    fetchTable();
  }, [fetchTable]);

  const refetch = useCallback(() => {
    fetchTable();
  }, [fetchTable]);

  return {
    table: activeTable,
    columns,
    rows,
    views,
    isLoading: isLoadingTable,
    error,
    refetch,
  };
}

/**
 * Hook to fetch tables list
 */
export function useTablesList() {
  const {
    tables,
    setTables,
    setLoadingTables,
    isLoadingTables,
  } = useTablesStore();

  const fetchTables = useCallback(async () => {
    setLoadingTables(true);
    try {
      const response = await fetch("/api/tables");
      const data = await response.json();
      if (data.tables) {
        setTables(data.tables);
      }
    } catch (err) {
      console.error("Error fetching tables:", err);
    } finally {
      setLoadingTables(false);
    }
  }, [setTables, setLoadingTables]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  return {
    tables,
    isLoading: isLoadingTables,
    refetch: fetchTables,
  };
}
