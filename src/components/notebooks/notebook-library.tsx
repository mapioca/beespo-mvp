"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NotebookGrid } from "./notebook-grid";
import { CreateNotebookModal } from "./create-notebook-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Book } from "lucide-react";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { toast } from "@/lib/toast";

interface Notebook {
    id: string;
    title: string;
    cover_style: string;
    updated_at: string;
    notes_count?: number;
}

interface NotebookWithNotes {
    id: string;
    title: string;
    cover_style: string;
    updated_at: string;
    notes: { count: number }[];
}

export function NotebookLibrary() {
    const [notebooks, setNotebooks] = useState<Notebook[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const fetchNotebooks = useCallback(async () => {
        setIsLoading(true);

        // Get notebooks with notes count
        const { data, error } = await (supabase
            .from("notebooks") as ReturnType<typeof supabase.from>)
            .select(`
        id,
        title,
        cover_style,
        updated_at,
        notes:notes(count)
      `)
            .order("updated_at", { ascending: false });

        if (error) {
            console.error("Error fetching notebooks:", error);
            toast.error("Failed to load notebooks");
        } else if (data) {
            // Transform notes count from array to number
            const transformed = data.map((notebook: NotebookWithNotes) => ({
                ...notebook,
                notes_count: Array.isArray(notebook.notes)
                    ? notebook.notes[0]?.count ?? 0
                    : 0,
            }));
            setNotebooks(transformed as unknown as Notebook[]);
        }

        setIsLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchNotebooks();
    }, [fetchNotebooks]);

    const handleCreateNotebook = async (title: string, coverStyle: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Get workspace_id from profile
        const { data: profile } = await (supabase
            .from("profiles") as ReturnType<typeof supabase.from>)
            .select("workspace_id")
            .eq("id", user.id)
            .single();

        if (!profile?.workspace_id) throw new Error("No workspace");

        const { data, error } = await (supabase
            .from("notebooks") as ReturnType<typeof supabase.from>)
            .insert({
                title,
                cover_style: coverStyle,
                workspace_id: profile.workspace_id,
                created_by: user.id,
            })
            .select()
            .single();

        if (error) throw error;

        toast.success("Notebook created", { description: `"${title}" is ready for your notes.` });

        // Refresh list and navigate to new notebook
        await fetchNotebooks();
        if (data) {
            router.push(`/notebooks/${data.id}`);
        }
    };

    const filteredNotebooks = notebooks.filter((notebook) =>
        notebook.title.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-muted/30">
            {/* Breadcrumb */}
            <Breadcrumbs
                items={[
                    { label: "Notebooks", icon: <Book className="h-3.5 w-3.5" /> },
                ]}
            />

            {/* Action Bar */}
            <div className="flex items-center justify-between w-full px-6 pt-5 pb-4 shrink-0 flex-wrap gap-4">
                <div className="flex items-center gap-4 flex-wrap flex-1">
                    {/* Search */}
                    {notebooks.length > 0 && (
                        <div className="relative max-w-sm w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search notebooks..."
                                className="pl-9 h-9 bg-background"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                <Button variant="ghost" className="rounded-full border px-3.5 py-1 text-xs font-medium text-muted-foreground border-border hover:bg-stone-200 hover:text-foreground hover:border-stone-200 transition-all shadow-sm" onClick={() => setIsModalOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    New
                </Button>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-6">
                {isLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="rounded-lg bg-muted animate-pulse"
                                style={{ aspectRatio: "3/4" }}
                            />
                        ))}
                    </div>
                ) : (
                    <NotebookGrid notebooks={filteredNotebooks} />
                )}
            </div>

            {/* Create Modal */}
            <CreateNotebookModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onCreateNotebook={handleCreateNotebook}
            />
        </div>
    );
}
