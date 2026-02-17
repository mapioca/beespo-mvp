"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import { getCoverById } from "@/lib/notebooks/notebook-covers";
import type { NotebooksData, DragHandleProps } from "@/types/dashboard";
import { WidgetCard } from "./widget-card";

interface Props {
  data: NotebooksData;
  dragHandleProps?: DragHandleProps;
  isDragging?: boolean;
}

export function NotebooksWidget({ data, dragHandleProps, isDragging }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await (
        supabase.from("profiles") as ReturnType<typeof supabase.from>
      )
        .select("workspace_id")
        .eq("id", user.id)
        .single();

      if (!profile?.workspace_id) throw new Error("No workspace");

      const { data: notebook, error } = await (
        supabase.from("notebooks") as ReturnType<typeof supabase.from>
      )
        .insert({
          title: "Untitled Notebook",
          cover_style: "gradient-ocean",
          workspace_id: profile.workspace_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Notebook created");
      if (notebook) {
        router.push(`/notebooks/${(notebook as { id: string }).id}`);
      }
    } catch {
      toast.error("Failed to create notebook");
    } finally {
      setCreating(false);
    }
  };

  return (
    <WidgetCard
      title="Notebooks"
      icon={<BookOpen className="h-4 w-4 text-muted-foreground" />}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      {data.notebooks.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Create your first notebook
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCreate}
            disabled={creating}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            New Notebook
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-2">
            {data.notebooks.map((nb) => {
              const cover = getCoverById(nb.cover_style);
              return (
                <Link
                  key={nb.id}
                  href={`/notebooks/${nb.id}`}
                  className="block rounded-lg overflow-hidden hover:ring-2 hover:ring-primary/30 transition-all"
                >
                  <div
                    className="p-3 min-h-[56px] flex items-end"
                    style={{ background: cover.gradient }}
                  >
                    <p
                      className={`text-sm font-medium truncate ${
                        cover.textColor === "light"
                          ? "text-white"
                          : "text-gray-900"
                      }`}
                    >
                      {nb.title}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <Link
              href="/notebooks"
              className="text-xs font-medium text-primary hover:text-primary/80"
            >
              View all notebooks
            </Link>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCreate}
              disabled={creating}
              className="h-7 px-2 text-xs gap-1"
            >
              <Plus className="h-3 w-3" />
              New
            </Button>
          </div>
        </>
      )}
    </WidgetCard>
  );
}
