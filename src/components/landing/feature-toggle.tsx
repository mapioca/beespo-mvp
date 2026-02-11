"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Music, MessageSquare, Megaphone, User, GripVertical } from "lucide-react";

const agendaItems = [
  {
    type: "procedural",
    icon: Music,
    title: "Opening Hymn",
    subtitle: "#152 - God Be With You",
    color: "bg-blue-100 text-blue-700",
    duration: "3 min",
  },
  {
    type: "speaker",
    icon: User,
    title: "Youth Speaker",
    subtitle: "Emma Johnson",
    color: "bg-pink-100 text-pink-700",
    duration: "5 min",
  },
  {
    type: "discussion",
    icon: MessageSquare,
    title: "Ward Business",
    subtitle: "Sustainings & Releases",
    color: "bg-green-100 text-green-700",
    duration: "10 min",
  },
  {
    type: "announcement",
    icon: Megaphone,
    title: "Announcements",
    subtitle: "Youth Conference, Temple Trip",
    color: "bg-orange-100 text-orange-700",
    duration: "5 min",
  },
];

export function FeatureToggle() {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="border border-neutral-200 bg-white p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-medium text-neutral-900">
              Sacrament Meeting
            </h4>
            <p className="text-[10px] text-neutral-400 font-mono">
              Feb 16, 2026 • 23 min total
            </p>
          </div>
          <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-1 font-mono">
            4 items
          </span>
        </div>

        {/* Agenda items */}
        <div className="space-y-1.5">
          {agendaItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                whileHover={{ scale: 1.01 }}
                onHoverStart={() => setDraggedIndex(index)}
                onHoverEnd={() => setDraggedIndex(null)}
                className={`flex items-center gap-3 p-2.5 border border-neutral-200 bg-white cursor-grab active:cursor-grabbing transition-shadow ${
                  draggedIndex === index ? "shadow-md" : ""
                }`}
              >
                <GripVertical className="w-3 h-3 text-neutral-300 flex-shrink-0" />
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${item.color}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-900 truncate">
                    {item.title}
                  </p>
                  <p className="text-[10px] text-neutral-500 truncate">
                    {item.subtitle}
                  </p>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono flex-shrink-0">
                  {item.duration}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Add item hint */}
        <div className="mt-2 border border-dashed border-neutral-200 p-2 text-center">
          <span className="text-[10px] text-neutral-400">
            + Drag items from toolbox
          </span>
        </div>
      </div>
      <p className="text-xs text-neutral-400 font-mono text-center">
        Drag-and-drop meeting builder
      </p>
    </div>
  );
}
