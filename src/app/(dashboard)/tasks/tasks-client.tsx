"use client";

import { useState, useMemo } from "react";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { TasksTable } from "@/components/tasks/tasks-table";
import { TaskFilters, TaskStatus, TaskPriority } from "@/components/tasks/task-filters";
import { Separator } from "@/components/ui/separator";

interface Task {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    assigned_to: string | null;
    workspace_task_id: string | null;
    assignee?: { full_name: string } | null;
}

interface TasksClientProps {
    tasks: Task[];
    userId: string;
    profiles: { id: string; full_name: string; email?: string }[];
}

export function TasksClient({ tasks, profiles }: TasksClientProps) {
    const [filters, setFilters] = useState<{
        search: string;
        status: TaskStatus[];
        priority: TaskPriority[];
        assignees: string[];
    }>({
        search: "",
        status: [],
        priority: [],
        assignees: [],
    });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Apply filters and sort
    const filteredTasks = useMemo(() => {
        const result = tasks.filter((task) => {
            // Search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesSearch =
                    task.title?.toLowerCase().includes(searchLower) ||
                    task.description?.toLowerCase().includes(searchLower) ||
                    task.workspace_task_id?.toLowerCase().includes(searchLower);
                if (!matchesSearch) return false;
            }

            // Status filter
            if (filters.status.length > 0) {
                const effectiveStatus = task.status === 'in_progress' ? 'pending' : task.status;
                if (!filters.status.includes(effectiveStatus as TaskStatus)) {
                    return false;
                }
            }

            // Assignee filter
            return filters.assignees.length === 0 || (task.assigned_to !== null && filters.assignees.includes(task.assigned_to));
        });

        if (sortConfig) {
            result.sort((a, b) => {
                const { key, direction } = sortConfig;
                let aValue: any = (a as any)[key];
                let bValue: any = (b as any)[key];

                // Handle nested assignee
                if (key === 'assignee') {
                    aValue = a.assignee?.full_name || '';
                    bValue = b.assignee?.full_name || '';
                }

                // Handle Priority order
                if (key === 'priority') {
                    const priorityOrder = { high: 1, medium: 2, low: 3 };
                    aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 99;
                    bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 99;
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
    }, [tasks, filters, sortConfig]);

    // Calculate counts for filter dropdowns
    const statusCounts = useMemo(() => {
        const counts: Record<TaskStatus, number> = {
            pending: 0,
            in_progress: 0,
            completed: 0,
            cancelled: 0,
        };
        tasks.forEach((task) => {
            const effectiveStatus = task.status === 'in_progress' ? 'pending' : task.status;
            if (effectiveStatus in counts) {
                counts[effectiveStatus as TaskStatus]++;
            }
        });
        return counts;
    }, [tasks]);

    const priorityCounts = useMemo(() => {
        const counts: Record<TaskPriority, number> = {
            low: 0,
            medium: 0,
            high: 0,
        };
        tasks.forEach((task) => {
            if (task.priority in counts) {
                counts[task.priority as TaskPriority]++;
            }
        });
        return counts;
    }, [tasks]);

    // Get unique assignees
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
                    <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage your action items and assignments.
                    </p>
                </div>
                <CreateTaskDialog />
            </div>

            <Separator />

            {/* Filters */}
            <TaskFilters
                onFilterChange={setFilters}
                statusCounts={statusCounts}
                priorityCounts={priorityCounts}
                assignees={assignees}
            />

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
