"use client";

import { useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteReleaseNoteAction } from "@/app/(admin)/admin/release-notes/actions";
import { toast } from "@/lib/toast";
import type { ReleaseNote } from "@/types/release-notes";

function getStatusBadge(note: ReleaseNote) {
  if (note.status === "draft") {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-700 text-zinc-300">
        Draft
      </span>
    );
  }

  if (note.published_at && new Date(note.published_at) > new Date()) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-900/50 text-amber-400">
        Scheduled
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-900/50 text-emerald-400">
      Published
    </span>
  );
}

interface ReleaseNotesDataTableProps {
  notes: ReleaseNote[];
}

export function ReleaseNotesDataTable({ notes }: ReleaseNotesDataTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await deleteReleaseNoteAction(id);
    if (result.success) {
      toast.success("Release note deleted");
    } else {
      toast.error(result.error || "Failed to delete");
    }
    setDeletingId(null);
  };

  if (notes.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center">
        <p className="text-zinc-400 text-sm">
          No release notes yet. Create one to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Title
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Version
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Status
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Items
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Date
            </th>
            <th className="w-12 px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {notes.map((note) => {
            const features = note.content.filter((i) => i.type === "feature").length;
            const fixes = note.content.filter((i) => i.type === "fix").length;

            return (
              <tr
                key={note.id}
                className="hover:bg-zinc-800/50 transition-colors"
              >
                <td className="px-4 py-3 text-zinc-100 font-medium">
                  {note.title}
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {note.version || "-"}
                </td>
                <td className="px-4 py-3">{getStatusBadge(note)}</td>
                <td className="px-4 py-3 text-zinc-400">
                  {features > 0 && (
                    <span className="text-emerald-400">{features} feature{features !== 1 ? "s" : ""}</span>
                  )}
                  {features > 0 && fixes > 0 && ", "}
                  {fixes > 0 && (
                    <span className="text-blue-400">{fixes} fix{fixes !== 1 ? "es" : ""}</span>
                  )}
                  {features === 0 && fixes === 0 && "-"}
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {note.published_at
                    ? format(new Date(note.published_at), "MMM d, yyyy")
                    : format(new Date(note.created_at), "MMM d, yyyy")}
                </td>
                <td className="px-4 py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-400 hover:text-zinc-200"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-zinc-900 border-zinc-700"
                    >
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/release-notes/${note.id}/edit`}
                          className="cursor-pointer"
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      {note.status === "draft" && (
                        <DropdownMenuItem
                          className="text-red-400 focus:text-red-400 cursor-pointer"
                          disabled={deletingId === note.id}
                          onClick={() => handleDelete(note.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
