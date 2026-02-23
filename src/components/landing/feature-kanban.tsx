"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

const stages = [
  { key: "defined", label: "Defined", status: "complete" },
  { key: "approved", label: "Approved", status: "complete" },
  { key: "extended", label: "Extended", status: "current" },
  { key: "accepted", label: "Accepted", status: "pending" },
  { key: "sustained", label: "Sustained", status: "pending" },
  { key: "set_apart", label: "Set Apart", status: "pending" },
  { key: "recorded", label: "Recorded", status: "pending" },
];

const candidates = [
  { name: "Sarah M.", calling: "RS 2nd Counselor", stage: "extended" },
  { name: "David L.", calling: "EQ Secretary", stage: "approved" },
];

export function FeatureKanban() {
  return (
    <div className="space-y-4">
      <div className="border border-neutral-200 bg-white p-4">
        {/* Stage stepper */}
        <div className="flex items-center justify-between mb-6 overflow-x-auto">
          {stages.map((stage, index) => (
            <div key={stage.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${
                    stage.status === "complete"
                      ? "bg-neutral-900 text-white"
                      : stage.status === "current"
                        ? "border-2 border-neutral-900 text-neutral-900"
                        : "border border-neutral-300 text-neutral-400"
                  }`}
                >
                  {stage.status === "complete" ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`text-[9px] mt-1 whitespace-nowrap ${
                    stage.status === "pending"
                      ? "text-neutral-400"
                      : "text-neutral-700"
                  }`}
                >
                  {stage.label}
                </span>
              </div>
              {index < stages.length - 1 && (
                <div
                  className={`w-4 md:w-8 h-px mx-1 ${
                    stage.status === "complete"
                      ? "bg-neutral-900"
                      : "bg-neutral-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Candidate cards */}
        <div className="space-y-2">
          {candidates.map((candidate) => (
            <motion.div
              key={candidate.name}
              whileHover={{ x: 2 }}
              className="flex items-center justify-between p-3 border border-neutral-200 bg-neutral-50 cursor-pointer hover:bg-white transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {candidate.name}
                </p>
                <p className="text-xs text-neutral-500">{candidate.calling}</p>
              </div>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                  candidate.stage === "extended"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {stages.find((s) => s.key === candidate.stage)?.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
      <p className="text-xs text-neutral-400 font-mono text-center">
        Track callings through 7 stages
      </p>
    </div>
  );
}
