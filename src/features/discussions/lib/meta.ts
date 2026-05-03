"use client";

import type { DiscussionPriority, DiscussionState, TaskPriority, TaskStatus } from "../data/types";

export type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "muted";

export const STATE_TONE: Record<DiscussionState, Tone> = {
  draft: "muted",
  active: "primary",
  closed: "neutral",
};

export const PRIORITY_LABEL: Record<DiscussionPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const PRIORITY_TONE: Record<DiscussionPriority, Tone> = {
  urgent: "danger",
  high: "warning",
  medium: "primary",
  low: "muted",
};

export const PRIORITY_RANK: Record<DiscussionPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const TASK_PRIORITY_ORDER: TaskPriority[] = ["urgent", "high", "medium", "low"];

export const TASK_STATUS_TONE: Record<TaskStatus, Tone> = {
  todo: "primary",
  in_progress: "primary",
  blocked: "warning",
  done: "success",
};

export function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
