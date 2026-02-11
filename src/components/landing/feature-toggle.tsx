"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const toggleItems = [
  {
    title: "Auto-generate agenda from callings",
    content: "Pull incomplete calling processes into your next agenda automatically.",
  },
  {
    title: "Smart reminders before meetings",
    content: "Notify participants 24 hours before with their specific assignments.",
  },
  {
    title: "Sync with ward calendar",
    content: "Two-way sync keeps everyone on the same page.",
  },
];

export function FeatureToggle() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-4">
      <div className="border border-neutral-200 rounded-sm bg-white divide-y divide-neutral-100">
        {toggleItems.map((item, index) => (
          <div key={item.title}>
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-neutral-50 transition-colors"
            >
              <motion.span
                animate={{ rotate: openIndex === index ? 90 : 0 }}
                transition={{ duration: 0.15 }}
                className="text-neutral-400 text-xs"
              >
                ▶
              </motion.span>
              <span className="text-sm text-neutral-700">{item.title}</span>
            </button>
            <AnimatePresence>
              {openIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <p className="text-xs text-neutral-500 px-3 pb-3 pl-8">
                    {item.content}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
      <p className="text-xs text-neutral-400 font-mono text-center">
        Toggle complexity on and off
      </p>
    </div>
  );
}
