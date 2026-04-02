"use client";

import Link from "next/link";
import { getCoverById } from "@/lib/notebooks/notebook-covers";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Share2, Trash2, FolderOpen } from "lucide-react";

interface NotebookCardProps {
    id: string;
    title: string;
    coverStyle: string;
    updatedAt: string;
    notesCount?: number;
    onRename?: (id: string, title: string) => void;
    onDelete?: (id: string, title: string) => void;
    onShare?: (id: string, title: string) => void;
}

export function NotebookCard({
    id,
    title,
    coverStyle,
    updatedAt,
    notesCount = 0,
    onRename,
    onDelete,
    onShare,
}: NotebookCardProps) {
    const cover = getCoverById(coverStyle);
    const updatedLabel = formatDistanceToNow(new Date(updatedAt), { addSuffix: true });

    return (
        <div className="group">
            <Link
                href={`/notebooks/${id}`}
                className="block rounded-[18px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
                <div
                    className={cn(
                        "relative overflow-hidden rounded-[18px] transition-all duration-300 ease-out",
                        "border border-border/70 bg-white shadow-[0_14px_28px_rgba(15,23,42,0.08)]",
                        "hover:-translate-y-0.5 hover:shadow-[0_20px_38px_rgba(15,23,42,0.12)]",
                        "cursor-pointer"
                    )}
                    style={{ aspectRatio: "0.74" }}
                >
                    <div className="absolute inset-0" style={{ background: cover.gradient }} />
                    <div className="absolute inset-x-5 top-[18%]">
                        <h3
                            className="line-clamp-4 text-[28px] font-semibold leading-[1.02] tracking-[-0.05em] text-zinc-950"
                        >
                            {title}
                        </h3>
                    </div>

                    <div className="absolute inset-x-5 bottom-5">
                        <div className="border-t border-black/10 pt-3 text-[11px] font-medium text-black/54">
                            Updated {updatedLabel}
                        </div>
                    </div>
                </div>
            </Link>

            <div className="mt-2.5 flex items-center justify-between gap-3 px-0.5">
                <div className="inline-flex items-center rounded-full border border-black bg-black px-2.5 py-1 text-[11px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                    {notesCount} note{notesCount !== 1 ? "s" : ""}
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-muted-foreground hover:bg-control/70 hover:text-foreground"
                        >
                            <MoreHorizontal className="h-4 w-4 stroke-[1.8]" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild>
                            <Link href={`/notebooks/${id}`}>
                                <FolderOpen className="mr-2 h-4 w-4" />
                                Open
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onRename?.(id, title)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onShare?.(id, title)}>
                            <Share2 className="mr-2 h-4 w-4" />
                            Share
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={`/notebooks/${id}`}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => onDelete?.(id, title)}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
