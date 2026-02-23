"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const columns = [
  { key: "name", label: "Name", type: "text" },
  { key: "status", label: "Status", type: "select" },
  { key: "assignee", label: "Assignee", type: "user" },
  { key: "date", label: "Due Date", type: "date" },
];

const initialRows = [
  {
    id: 1,
    name: "Temple Trip Coordination",
    status: { label: "In Progress", color: "bg-yellow-100 text-yellow-700" },
    assignee: { name: "Bishop W.", initials: "BW" },
    date: "Feb 20",
  },
  {
    id: 2,
    name: "Youth Conference Planning",
    status: { label: "Not Started", color: "bg-neutral-100 text-neutral-600" },
    assignee: { name: "Bro. Smith", initials: "BS" },
    date: "Mar 5",
  },
  {
    id: 3,
    name: "Welfare Assessment",
    status: { label: "Complete", color: "bg-green-100 text-green-700" },
    assignee: { name: "Sis. Davis", initials: "SD" },
    date: "Feb 10",
  },
];

export function FeatureTable() {
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [editingCell, setEditingCell] = useState<{
    row: number;
    col: string;
  } | null>(null);

  return (
    <div>
      <div className="border border-neutral-200 bg-white overflow-hidden rounded-sm shadow-lg">
        {/* Header */}
        <div className="grid grid-cols-4 bg-neutral-50 border-b border-neutral-200">
          {columns.map((col) => (
            <div
              key={col.key}
              className="px-3 py-2 text-[10px] font-medium text-neutral-500 uppercase tracking-wider border-r border-neutral-100 last:border-r-0"
            >
              {col.label}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className="divide-y divide-neutral-100">
          {initialRows.map((row) => (
            <motion.div
              key={row.id}
              onClick={() => setSelectedRow(row.id)}
              className={`grid grid-cols-4 cursor-pointer transition-colors ${
                selectedRow === row.id ? "bg-blue-50" : "hover:bg-neutral-50"
              }`}
            >
              {/* Name cell */}
              <div
                className="px-3 py-2.5 border-r border-neutral-100"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingCell({ row: row.id, col: "name" });
                }}
              >
                {editingCell?.row === row.id && editingCell?.col === "name" ? (
                  <input
                    autoFocus
                    defaultValue={row.name}
                    className="text-xs w-full bg-transparent outline-none border-b border-blue-500"
                    onBlur={() => setEditingCell(null)}
                  />
                ) : (
                  <span className="text-xs text-neutral-900 truncate block">
                    {row.name}
                  </span>
                )}
              </div>

              {/* Status cell */}
              <div className="px-3 py-2 border-r border-neutral-100 flex items-center">
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${row.status.color}`}
                >
                  {row.status.label}
                </span>
                <ChevronDown className="w-3 h-3 ml-auto text-neutral-400" />
              </div>

              {/* Assignee cell */}
              <div className="px-3 py-2 border-r border-neutral-100 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-neutral-200 flex items-center justify-center text-[8px] font-medium text-neutral-600">
                  {row.assignee.initials}
                </div>
                <span className="text-xs text-neutral-700 truncate">
                  {row.assignee.name}
                </span>
              </div>

              {/* Date cell */}
              <div className="px-3 py-2 flex items-center">
                <span className="text-xs text-neutral-500 font-mono">
                  {row.date}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Add row */}
        <div className="px-3 py-2 border-t border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer">
          <span className="text-xs text-neutral-400">+ New row</span>
        </div>
      </div>
    </div>
  );
}
