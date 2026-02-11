"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  ListTodo,
  FileText,
  Settings,
  ChevronRight,
  Bell,
  Plus,
} from "lucide-react";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Calendar, label: "Meetings", count: 3 },
  { icon: Users, label: "Callings", count: 5 },
  { icon: ListTodo, label: "Tasks", count: 12 },
  { icon: FileText, label: "Tables" },
  { icon: Settings, label: "Settings" },
];

const upcomingMeetings = [
  { title: "Bishopric Meeting", time: "Today, 6:00 PM", items: 8 },
  { title: "Ward Council", time: "Sun, 8:00 AM", items: 12 },
  { title: "Youth Committee", time: "Wed, 7:00 PM", items: 5 },
];

const recentTasks = [
  { title: "Follow up with Bro. Jensen", priority: "high", due: "Today" },
  { title: "Review temple recommend list", priority: "medium", due: "Tomorrow" },
  { title: "Prepare youth conference agenda", priority: "low", due: "Feb 20" },
];

const priorityColors = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-neutral-100 text-neutral-600",
};

export function DashboardPreview() {
  const [activeItem, setActiveItem] = useState("Dashboard");

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-4xl mx-auto mt-16 md:mt-20"
    >
      {/* Browser frame */}
      <div className="border border-neutral-200 bg-white shadow-xl rounded-sm overflow-hidden">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-neutral-50 border-b border-neutral-200">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-300" />
          </div>
          <div className="flex-1 mx-4">
            <div className="h-6 bg-white border border-neutral-200 rounded-sm flex items-center justify-center">
              <span className="text-[10px] text-neutral-400 font-mono">
                app.beespo.com/dashboard
              </span>
            </div>
          </div>
          <Bell className="w-4 h-4 text-neutral-400" />
        </div>

        {/* App layout */}
        <div className="flex min-h-[380px]">
          {/* Sidebar */}
          <div className="hidden sm:flex flex-col w-48 bg-neutral-50 border-r border-neutral-200 p-3">
            {/* Logo */}
            <div className="flex items-center gap-2 px-2 py-1 mb-4">
              <div className="w-6 h-6 bg-neutral-900 rounded-sm" />
              <span className="text-sm font-semibold">Beespo</span>
            </div>

            {/* Workspace */}
            <div className="px-2 py-1.5 mb-2 bg-white border border-neutral-200 rounded-sm flex items-center justify-between cursor-pointer hover:bg-neutral-50 transition-colors">
              <span className="text-xs font-medium truncate">Riverside Ward</span>
              <ChevronRight className="w-3 h-3 text-neutral-400" />
            </div>

            {/* Nav items */}
            <nav className="space-y-0.5 flex-1">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeItem === item.label;
                return (
                  <motion.button
                    key={item.label}
                    onClick={() => setActiveItem(item.label)}
                    whileHover={{ x: 2 }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-left transition-colors ${
                      isActive
                        ? "bg-neutral-900 text-white"
                        : "text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-xs flex-1">{item.label}</span>
                    {item.count && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-neutral-200 text-neutral-600"
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </nav>
          </div>

          {/* Main content */}
          <div className="flex-1 p-4 md:p-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">
                  Good evening, Bishop
                </h2>
                <p className="text-xs text-neutral-500">
                  You have 3 meetings this week
                </p>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white text-xs rounded-sm hover:bg-neutral-800 transition-colors">
                <Plus className="w-3 h-3" />
                New Meeting
              </button>
            </div>

            {/* Content grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Upcoming meetings */}
              <div className="border border-neutral-200 rounded-sm">
                <div className="px-3 py-2 border-b border-neutral-100 flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-700">
                    Upcoming Meetings
                  </span>
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                </div>
                <div className="divide-y divide-neutral-100">
                  {upcomingMeetings.map((meeting) => (
                    <motion.div
                      key={meeting.title}
                      whileHover={{ backgroundColor: "rgb(250 250 250)" }}
                      className="px-3 py-2.5 cursor-pointer transition-colors"
                    >
                      <p className="text-xs font-medium text-neutral-900">
                        {meeting.title}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-neutral-500">
                          {meeting.time}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {meeting.items} items
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Recent tasks */}
              <div className="border border-neutral-200 rounded-sm">
                <div className="px-3 py-2 border-b border-neutral-100 flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-700">
                    My Tasks
                  </span>
                  <ListTodo className="w-3.5 h-3.5 text-neutral-400" />
                </div>
                <div className="divide-y divide-neutral-100">
                  {recentTasks.map((task) => (
                    <motion.div
                      key={task.title}
                      whileHover={{ backgroundColor: "rgb(250 250 250)" }}
                      className="px-3 py-2.5 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-3.5 h-3.5 border border-neutral-300 rounded-sm mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-neutral-900 truncate">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded ${
                                priorityColors[task.priority as keyof typeof priorityColors]
                              }`}
                            >
                              {task.priority}
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              {task.due}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </motion.div>
  );
}
