"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { deleteGlobalTemplateAction } from "@/app/(admin)/admin/templates/actions";
import { toast } from "@/lib/toast";
import { format } from "date-fns";

interface Template {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  is_shared: boolean;
  created_at: string;
  template_items: { count: number }[];
}

interface AdminTemplatesLayoutProps {
  templates: Template[];
}

export function AdminTemplatesLayout({ templates }: AdminTemplatesLayoutProps) {
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete template "${name}"? This cannot be undone.`)) return;

    const result = await deleteGlobalTemplateAction(id);
    if (result.success) {
      toast.success("Template deleted", { description: `"${name}" has been deleted.` });
    } else {
      toast.error(result.error || "Failed to delete template.");
    }
  };

  if (templates.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center">
        <p className="text-zinc-400 mb-2">No global templates yet.</p>
        <p className="text-sm text-zinc-500">
          Create a template to share it across all workspaces.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/50">
            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Name
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Items
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Tags
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Created
            </th>
            <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {templates.map((template) => (
            <tr
              key={template.id}
              className="hover:bg-zinc-800/30 transition-colors"
            >
              <td className="px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-200">
                    {template.name}
                  </p>
                  {template.description && (
                    <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-xs">
                      {template.description}
                    </p>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-zinc-400">
                {template.template_items?.[0]?.count ?? 0}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1 flex-wrap">
                  {template.tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="border-zinc-700 text-zinc-400 text-xs"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-zinc-500">
                {format(new Date(template.created_at), "MMM d, yyyy")}
              </td>
              <td className="px-4 py-3 text-right">
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
                    className="border-zinc-700 bg-zinc-800"
                  >
                    <DropdownMenuItem asChild className="text-zinc-300 focus:bg-zinc-700 focus:text-zinc-100">
                      <Link href={`/templates/${template.id}/edit`}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(template.id, template.name)}
                      className="text-red-400 focus:bg-zinc-700 focus:text-red-300"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
