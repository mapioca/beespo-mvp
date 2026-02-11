"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { FileText, ChevronRight, MoreHorizontal, Plus, Search } from "lucide-react";

const notebooks = [
  {
    name: "Ward Council Notes",
    notes: [
      { title: "Feb 9 - Welfare Coordination", preview: "Discussed the Smith family situation...", date: "Feb 9" },
      { title: "Feb 2 - Youth Programs", preview: "Planning for summer activities...", date: "Feb 2" },
    ],
  },
  {
    name: "Bishopric Notes",
    notes: [
      { title: "Stewardship Interviews", preview: "Template for quarterly reviews...", date: "Feb 8" },
    ],
  },
];

export function FeatureNotes() {
  const [expandedNotebook, setExpandedNotebook] = useState("Ward Council Notes");
  const [selectedNote, setSelectedNote] = useState("Feb 9 - Welfare Coordination");

  return (
    <div className="space-y-4">
      <div className="border border-neutral-200 bg-white overflow-hidden">
        <div className="flex min-h-[240px]">
          {/* Sidebar */}
          <div className="w-44 border-r border-neutral-200 bg-neutral-50 p-2">
            {/* Search */}
            <div className="flex items-center gap-2 px-2 py-1.5 mb-2 bg-white border border-neutral-200 rounded-sm">
              <Search className="w-3 h-3 text-neutral-400" />
              <span className="text-[10px] text-neutral-400">Search notes...</span>
            </div>

            {/* Notebooks */}
            <div className="space-y-0.5">
              {notebooks.map((notebook) => (
                <div key={notebook.name}>
                  <button
                    onClick={() =>
                      setExpandedNotebook(
                        expandedNotebook === notebook.name ? "" : notebook.name
                      )
                    }
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-sm hover:bg-neutral-100 transition-colors text-left"
                  >
                    <motion.div
                      animate={{
                        rotate: expandedNotebook === notebook.name ? 90 : 0,
                      }}
                      transition={{ duration: 0.15 }}
                    >
                      <ChevronRight className="w-3 h-3 text-neutral-400" />
                    </motion.div>
                    <FileText className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="text-[11px] font-medium text-neutral-700 truncate">
                      {notebook.name}
                    </span>
                  </button>

                  {expandedNotebook === notebook.name && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="ml-5 space-y-0.5 overflow-hidden"
                    >
                      {notebook.notes.map((note) => (
                        <button
                          key={note.title}
                          onClick={() => setSelectedNote(note.title)}
                          className={`w-full text-left px-2 py-1 rounded-sm transition-colors ${
                            selectedNote === note.title
                              ? "bg-neutral-900 text-white"
                              : "text-neutral-600 hover:bg-neutral-100"
                          }`}
                        >
                          <span className="text-[10px] truncate block">
                            {note.title}
                          </span>
                        </button>
                      ))}
                      <button className="w-full flex items-center gap-1 px-2 py-1 text-neutral-400 hover:text-neutral-600 transition-colors">
                        <Plus className="w-3 h-3" />
                        <span className="text-[10px]">New note</span>
                      </button>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Note content */}
          <div className="flex-1 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-neutral-900">
                Feb 9 - Welfare Coordination
              </h3>
              <MoreHorizontal className="w-4 h-4 text-neutral-400" />
            </div>

            <div className="space-y-2 text-xs text-neutral-600">
              <p>
                <span className="font-medium">Present:</span> Bishop Williams,
                RS President, EQ President
              </p>
              <div className="border-l-2 border-neutral-200 pl-3 py-1">
                <p className="text-neutral-500">
                  Discussed the Smith family situation. They&apos;ve been
                  struggling since...
                </p>
              </div>
              <p className="font-medium text-neutral-700">Action Items:</p>
              <div className="flex items-start gap-2">
                <div className="w-3.5 h-3.5 border border-neutral-300 rounded-sm mt-0.5" />
                <span>Coordinate meals for next two weeks</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-3.5 h-3.5 border border-neutral-300 rounded-sm mt-0.5 flex items-center justify-center text-[8px] text-neutral-500">
                  ✓
                </div>
                <span className="line-through text-neutral-400">
                  Schedule bishop visit
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-neutral-400 font-mono text-center">
        Organized notebooks with action items
      </p>
    </div>
  );
}
