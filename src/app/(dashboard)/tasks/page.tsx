import { createClient } from "@/lib/supabase/server";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { TasksTable } from "@/components/tasks/tasks-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export default async function TasksPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch all tasks for the organization
    // Note: We cast the response to any to bypass the complex type matching issues 
    // for the moment, as we know the shape matches what the table expects.
    const { data: rawTasks, error } = await supabase
        .from('tasks')
        .select(`
            *,
            assignee:profiles!tasks_assigned_to_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching tasks:", error);
    }

    // Transform to match Table props if needed, or just pass as is (with type casting)
    // The table expects tasks with assignee and comments
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tasks = (rawTasks || []).map((t: any) => ({
        ...t,
        // Flatten comment count if it comes back as array of objects
        comment_count: 0
    }));

    // Categorize
    const myTasks = tasks.filter((t: any) => t.assigned_to === user?.id && t.status !== 'completed');
    const assignedByMe = tasks.filter((t: any) => t.created_by === user?.id && t.status !== 'completed');
    const completedTasks = tasks.filter((t: any) => t.status === 'completed');
    const allPending = tasks.filter((t: any) => t.status !== 'completed');

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
                    <p className="text-muted-foreground mt-2">Manage your action items and assignments.</p>
                </div>
                <CreateTaskDialog />
            </div>

            <Separator />

            <Tabs defaultValue="my-tasks" className="w-full">
                <TabsList>
                    <TabsTrigger value="my-tasks">My Tasks ({myTasks.length})</TabsTrigger>
                    <TabsTrigger value="assigned">Assigned by Me ({assignedByMe.length})</TabsTrigger>
                    <TabsTrigger value="all">All Pending</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>

                <TabsContent value="my-tasks" className="mt-6">
                    <TasksTable tasks={myTasks} />
                </TabsContent>

                <TabsContent value="assigned" className="mt-6">
                    {/* Readonly true if we want to prevent them from completing others' tasks easily, though logic permits it */}
                    <TasksTable tasks={assignedByMe} />
                </TabsContent>

                <TabsContent value="all" className="mt-6">
                    <TasksTable tasks={allPending} />
                </TabsContent>

                <TabsContent value="completed" className="mt-6">
                    <TasksTable tasks={completedTasks} readonly />
                </TabsContent>
            </Tabs>
        </div>
    );
}
