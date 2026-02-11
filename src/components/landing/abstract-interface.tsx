"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const slashCommands = [
  { icon: "☐", label: "Agenda Item", desc: "Add discussion topic" },
  { icon: "+", label: "New Calling", desc: "Start calling process" },
  { icon: "◷", label: "Schedule Interview", desc: "Book a time slot" },
  { icon: "◈", label: "Create Task", desc: "Assign an action item" },
];

export function AbstractInterface() {
  const [showCursor, setShowCursor] = useState(true);
  const [typedText, setTypedText] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);

    const sequence = async () => {
      await delay(1500);
      setTypedText("/");
      await delay(400);
      setShowDropdown(true);
      await delay(800);
      setSelectedIndex(0);
      await delay(600);
      setSelectedIndex(1);
      await delay(600);
      setSelectedIndex(0);
      await delay(1500);
      setTypedText("");
      setShowDropdown(false);
      setSelectedIndex(-1);
    };

    sequence();
    const loopInterval = setInterval(sequence, 8000);

    return () => {
      clearInterval(cursorInterval);
      clearInterval(loopInterval);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-2xl mx-auto mt-16 md:mt-20"
    >
      {/* Document container */}
      <div className="border border-neutral-200 bg-white shadow-sm">
        {/* Document header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-200">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full border border-neutral-300" />
            <div className="w-2.5 h-2.5 rounded-full border border-neutral-300" />
            <div className="w-2.5 h-2.5 rounded-full border border-neutral-300" />
          </div>
          <span className="text-[10px] text-neutral-400 font-mono ml-2 tracking-wide">
            Ward Council — Feb 2026
          </span>
        </div>

        {/* Document content */}
        <div className="p-6 md:p-8 min-h-[220px]">
          {/* Page title */}
          <div className="flex items-start gap-3 mb-6">
            <span className="text-2xl">✦</span>
            <div>
              <h3 className="text-base font-semibold text-neutral-900">
                Weekly Coordination
              </h3>
              <p className="text-xs text-neutral-400 font-mono">
                Bishopric Meeting
              </p>
            </div>
          </div>

          {/* Existing items */}
          <div className="space-y-1.5 mb-4">
            <div className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-neutral-50 transition-colors">
              <span className="w-4 h-4 border border-neutral-300 rounded-sm flex items-center justify-center text-[10px] text-neutral-500">
                ✓
              </span>
              <span className="text-sm text-neutral-600">
                Review temple recommend interviews
              </span>
              <span className="ml-auto text-[10px] text-neutral-400 font-mono">
                Bishop
              </span>
            </div>
            <div className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-neutral-50 transition-colors">
              <span className="w-4 h-4 border border-neutral-300 rounded-sm" />
              <span className="text-sm text-neutral-600">
                Youth conference planning
              </span>
              <span className="ml-auto text-[10px] text-neutral-400 font-mono">
                2nd Counselor
              </span>
            </div>
          </div>

          {/* Slash command input line */}
          <div className="relative">
            <div className="flex items-center gap-1 py-1.5 px-2 rounded border border-dashed border-transparent hover:border-neutral-200 transition-colors">
              <span className="text-sm text-neutral-900">{typedText}</span>
              <span
                className={`w-0.5 h-4 bg-neutral-900 transition-opacity ${
                  showCursor ? "opacity-100" : "opacity-0"
                }`}
              />
              {!typedText && (
                <span className="text-sm text-neutral-300">
                  Type / for commands...
                </span>
              )}
            </div>

            {/* Dropdown menu */}
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 top-full mt-1 w-56 bg-white border border-neutral-200 shadow-lg z-10"
              >
                <div className="py-1">
                  {slashCommands.map((cmd, index) => (
                    <div
                      key={cmd.label}
                      className={`flex items-center gap-3 px-3 py-2 transition-colors ${
                        selectedIndex === index
                          ? "bg-neutral-100"
                          : "hover:bg-neutral-50"
                      }`}
                    >
                      <span className="w-5 h-5 bg-neutral-100 rounded flex items-center justify-center text-xs font-mono">
                        {cmd.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900">
                          {cmd.label}
                        </p>
                        <p className="text-[10px] text-neutral-400 truncate">
                          {cmd.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Caption */}
      <p className="mt-4 text-xs text-neutral-400 text-center font-mono">
        Everything starts with a slash command
      </p>

      {/* Gradient fade overlay */}
      <div className="absolute bottom-8 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </motion.div>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
