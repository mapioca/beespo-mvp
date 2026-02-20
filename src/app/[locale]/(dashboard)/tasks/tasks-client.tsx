"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { TasksTable } from "@/components/tasks/tasks-table";
import { TaskFilters, TaskStatus, TaskPriority } from "@/components/tasks/task-filters";
import { Separator } from "@/components/ui/separator";
import { Database } from "@/types/database";

type Task = Database['public']['Tables']['tasks']['Row'] & {
    assignee?: { full_name: string; email?: string } | null;
    comment_count?: number;
    workspace_task_id?: string | null;
    priority?: 'low' | 'medium' | 'high';
    labels?: Array<{ id: string; name: string; color: string }>;
};

interface TasksClientProps {
    tasks: Task[];
    userId: string;
    profiles: { id: string; full_name: string; email?: string }[];
    totalCount: number;
    statusCounts: Record<string, number>;
    priorityCounts: Record<string, number>;
    currentFilters: {
        search: string;
        status: string[];
    };
}

export function TasksClient({
    tasks,
    profiles,
    totalCount,
    statusCounts,
    priorityCounts,
    currentFilters,
}: TasksClientProps) {
    const t = useTranslations("Dashboard.Tasks");
    // Client-side filters for priority and assignees (not in URL yet)
    const [localFilters, setLocalFilters] = useState<{
        search: string;
        status: TaskStatus[];
        priority: TaskPriority[];
        assignees: string[];
    }>({
        search: currentFilters.search,
        status: currentFilters.status as TaskStatus[],
        priority: [],
        assignees: [],
    });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Apply client-side filters (priority, assignees) and sort
    // Server already filtered by search and status
    const filteredTasks = useMemo(() => {
        let result = tasks;

        // Priority filter (client-side)
        if (localFilters.priority.length > 0) {
            result = result.filter((task) =>
                task.priority && localFilters.priority.includes(task.priority as TaskPriority)
            );
        }

        // Assignee filter (client-side)
        if (localFilters.assignees.length > 0) {
            result = result.filter((task) =>
                task.assigned_to !== null && localFilters.assignees.includes(task.assigned_to)
            );
        }

        // Sort
        if (sortConfig) {
            result = [...result].sort((a, b) => {
                const { key, direction } = sortConfig;
                let aValue: string | number | null | undefined;
                let bValue: string | number | null | undefined;

                // Handle nested assignee
                if (key === 'assignee') {
                    aValue = a.assignee?.full_name || '';
                    bValue = b.assignee?.full_name || '';
                } else if (key === 'priority') {
                    const priorityOrder = { high: 1, medium: 2, low: 3 };
                    aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 99;
                    bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 99;
                } else {
                    aValue = a[key as keyof Task] as string | number | null | undefined;
                    bValue = b[key as keyof Task] as string | number | null | undefined;
                }

                // Handle nulls
                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;

                if (aValue < bValue) return direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [tasks, localFilters.priority, localFilters.assignees, sortConfig]);

    // Get unique assignees from current page tasks
    const assignees = useMemo(() => {
        const uniqueAssignees = new Map();
        tasks.forEach((task) => {
            if (task.assigned_to && task.assignee?.full_name) {
                uniqueAssignees.set(task.assigned_to, {
                    id: task.assigned_to,
                    full_name: task.assignee.full_name,
                });
            }
        });
        return Array.from(uniqueAssignees.values());
    }, [tasks]);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                    <p className="text-muted-foreground mt-2">
                        {t("subtitle")}
                    </p>
                </div>
                <CreateTaskDialog />
            </div>

            <Separator />

            {/* Filters */}
            <TaskFilters
                onFilterChange={setLocalFilters}
                statusCounts={statusCounts as Record<TaskStatus, number>}
                priorityCounts={priorityCounts as Record<TaskPriority, number>}
                assignees={assignees}
            />

            {/* Task count */}
            <div className="text-sm text-muted-foreground">
                {t("totalCount", { count: totalCount })}
            </div>

            {/* Tasks Table */}
            <div className="mt-6">
                <TasksTable
                    tasks={filteredTasks}
                    profiles={profiles}
                    sortConfig={sortConfig}
                    onSort={(key) => {
                        setSortConfig(current => {
                            if (current?.key === key) {
                                if (current.direction === 'asc') return { key, direction: 'desc' };
                                return null; // Reset
                            }
                            return { key, direction: 'asc' };
                        });
                    }}
                />
            </div>
        </div>
    );
}
