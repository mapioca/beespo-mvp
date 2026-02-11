"use client";

import { motion } from "framer-motion";

const columns = [
  {
    title: "Elders Quorum",
    cards: ["Temple trip coordination", "Move assistance"],
  },
  {
    title: "Relief Society",
    cards: ["Meal train signup", "Compassionate service"],
  },
  {
    title: "Ward Council",
    cards: ["Youth conference"],
  },
];

export function FeatureKanban() {
  return (
    <div className="space-y-4">
      {/* Mini kanban board */}
      <div className="border border-neutral-200 rounded-sm bg-white p-4">
        <div className="flex gap-3 overflow-x-auto">
          {columns.map((column) => (
            <div
              key={column.title}
              className="flex-shrink-0 w-40 bg-neutral-50 rounded-sm p-2"
            >
              <p className="text-xs font-medium text-neutral-500 mb-2 px-1">
                {column.title}
              </p>
              <div className="space-y-1.5">
                {column.cards.map((card) => (
                  <motion.div
                    key={card}
                    whileHover={{ scale: 1.02 }}
                    className="bg-white border border-neutral-200 rounded-sm p-2 shadow-sm cursor-grab active:cursor-grabbing"
                  >
                    <p className="text-xs text-neutral-700 truncate">{card}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-neutral-400 font-mono text-center">
        Drag items between organizations
      </p>
    </div>
  );
}
