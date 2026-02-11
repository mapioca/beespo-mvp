"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Circle, CheckCircle2, Clock, AlertCircle } from "lucide-react";

const tasks = [
  {
    id: "TASK-0042",
    title: "Follow up with the Jensen family",
    status: "in_progress",
    priority: "high",
    assignee: "Bishop W.",
    due: "Today",
    overdue: false,
  },
  {
    id: "TASK-0041",
    title: "Schedule temple recommend interviews",
    status: "pending",
    priority: "medium",
    assignee: "Exec. Sec.",
    due: "Feb 18",
    overdue: false,
  },
  {
    id: "TASK-0040",
    title: "Confirm youth conference speakers",
    status: "pending",
    priority: "high",
    assignee: "YM Pres.",
    due: "Feb 14",
    overdue: true,
  },
  {
    id: "TASK-0039",
    title: "Update welfare assessment notes",
    status: "completed",
    priority: "low",
    assignee: "RS Pres.",
    due: "Feb 10",
    overdue: false,
  },
];

const statusConfig = {
  pending: { icon: Circle, color: "text-neutral-400", label: "Pending" },
  in_progress: { icon: Clock, color: "text-blue-500", label: "In Progress" },
  completed: { icon: CheckCircle2, color: "text-green-500", label: "Done" },
};

const priorityConfig = {
  high: { color: "bg-red-100 text-red-700", label: "High" },
  medium: { color: "bg-yellow-100 text-yellow-700", label: "Medium" },
  low: { color: "bg-neutral-100 text-neutral-600", label: "Low" },
};

export function FeatureTasks() {
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);

  return (
    <div>
      <div className="border border-neutral-200 bg-white overflow-hidden rounded-sm shadow-lg">
        {/* Header */}
        <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-700">My Tasks</span>
          <span className="text-[10px] text-neutral-400">4 items</span>
        </div>

        {/* Task list */}
        <div className="divide-y divide-neutral-100">
          {tasks.map((task) => {
            const StatusIcon =
              statusConfig[task.status as keyof typeof statusConfig].icon;
            const statusColor =
              statusConfig[task.status as keyof typeof statusConfig].color;
            const priorityInfo =
              priorityConfig[task.priority as keyof typeof priorityConfig];

            return (
              <motion.div
                key={task.id}
                onHoverStart={() => setHoveredTask(task.id)}
                onHoverEnd={() => setHoveredTask(null)}
                className={`px-4 py-3 cursor-pointer transition-colors ${
                  hoveredTask === task.id ? "bg-neutral-50" : ""
                } ${task.status === "completed" ? "opacity-50" : ""}`}
              >
                <div className="flex items-start gap-3">
                  {/* Status icon */}
                  <StatusIcon
                    className={`w-4 h-4 mt-0.5 flex-shrink-0 ${statusColor}`}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${
                        task.status === "completed"
                          ? "line-through text-neutral-500"
                          : "text-neutral-900"
                      }`}
                    >
                      {task.title}
                    </p>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-[10px] font-mono text-neutral-400">
                        {task.id}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${priorityInfo.color}`}
                      >
                        {priorityInfo.label}
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        {task.assignee}
                      </span>
                      <span
                        className={`text-[10px] flex items-center gap-1 ${
                          task.overdue ? "text-red-600" : "text-neutral-400"
                        }`}
                      >
                        {task.overdue && (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        {task.due}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
