"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dates = [16, 17, 18, 19, 20, 21, 22];

const events = [
  { day: 0, hour: 9, title: "Sacrament", duration: 2, color: "bg-blue-100 border-blue-300 text-blue-700" },
  { day: 0, hour: 13, title: "PEC", duration: 1, color: "bg-purple-100 border-purple-300 text-purple-700" },
  { day: 2, hour: 18, title: "Bishopric", duration: 1.5, color: "bg-green-100 border-green-300 text-green-700" },
  { day: 3, hour: 19, title: "Youth", duration: 2, color: "bg-orange-100 border-orange-300 text-orange-700" },
  { day: 5, hour: 10, title: "Temple Trip", duration: 4, color: "bg-pink-100 border-pink-300 text-pink-700" },
];

const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

export function FeatureCalendar() {
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="border border-neutral-200 bg-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center gap-2">
            <button className="p-1 hover:bg-neutral-200 rounded transition-colors">
              <ChevronLeft className="w-3.5 h-3.5 text-neutral-600" />
            </button>
            <span className="text-xs font-medium text-neutral-700">
              February 2026
            </span>
            <button className="p-1 hover:bg-neutral-200 rounded transition-colors">
              <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
            </button>
          </div>
          <div className="flex gap-1">
            <span className="text-[10px] px-2 py-0.5 bg-neutral-900 text-white rounded-sm">
              Week
            </span>
            <span className="text-[10px] px-2 py-0.5 text-neutral-500 hover:bg-neutral-100 rounded-sm cursor-pointer">
              Month
            </span>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-8 border-b border-neutral-200">
          <div className="w-10" /> {/* Time column spacer */}
          {days.map((day, i) => (
            <div
              key={day}
              className={`text-center py-2 border-l border-neutral-100 ${
                i === 0 ? "bg-blue-50" : ""
              }`}
            >
              <p className="text-[10px] text-neutral-500">{day}</p>
              <p
                className={`text-xs font-medium ${
                  i === 0
                    ? "w-5 h-5 bg-neutral-900 text-white rounded-full flex items-center justify-center mx-auto mt-0.5"
                    : "text-neutral-700 mt-0.5"
                }`}
              >
                {dates[i]}
              </p>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="relative h-48 overflow-hidden">
          <div className="absolute inset-0">
            {hours.slice(0, 6).map((hour) => (
              <div
                key={hour}
                className="grid grid-cols-8 border-b border-neutral-100"
                style={{ height: "32px" }}
              >
                <div className="w-10 pr-2 flex items-start justify-end">
                  <span className="text-[9px] text-neutral-400 -mt-1.5">
                    {hour > 12 ? hour - 12 : hour}
                    {hour >= 12 ? "pm" : "am"}
                  </span>
                </div>
                {days.map((_, dayIndex) => (
                  <div
                    key={dayIndex}
                    className="border-l border-neutral-100 relative"
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Events */}
          {events.slice(0, 3).map((event) => {
            const top = (event.hour - 8) * 32;
            const height = event.duration * 32;
            const left = `calc(${(event.day + 1) * 12.5}% + 2px)`;

            return (
              <motion.div
                key={event.title}
                onHoverStart={() => setHoveredEvent(event.title)}
                onHoverEnd={() => setHoveredEvent(null)}
                whileHover={{ scale: 1.02 }}
                className={`absolute rounded-sm border px-1.5 py-1 cursor-pointer transition-shadow ${
                  event.color
                } ${hoveredEvent === event.title ? "shadow-md z-10" : ""}`}
                style={{
                  top: `${top}px`,
                  height: `${height - 2}px`,
                  left,
                  width: "calc(12.5% - 4px)",
                }}
              >
                <p className="text-[9px] font-medium truncate">{event.title}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-neutral-400 font-mono text-center">
        Week view with color-coded events
      </p>
    </div>
  );
}
