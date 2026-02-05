"use client";

import Link from "next/link";
import { getCoverById } from "@/lib/notebooks/notebook-covers";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface NotebookCardProps {
    id: string;
    title: string;
    coverStyle: string;
    updatedAt: string;
    notesCount?: number;
}

export function NotebookCard({
    id,
    title,
    coverStyle,
    updatedAt,
    notesCount = 0,
}: NotebookCardProps) {
    const cover = getCoverById(coverStyle);

    return (
        <Link
            href={`/notebooks/${id}`}
            className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
        >
            <div
                className={cn(
                    "relative overflow-hidden rounded-lg transition-all duration-300 ease-out",
                    "shadow-md hover:shadow-xl",
                    "transform hover:scale-[1.03] hover:-translate-y-1",
                    "cursor-pointer"
                )}
                style={{ aspectRatio: "3/4" }}
            >
                {/* Cover Background */}
                <div
                    className="absolute inset-0"
                    style={{ background: cover.gradient }}
                />

                {/* 3D Book Effect - Spine Shadow */}
                <div className="absolute inset-y-0 left-0 w-3 bg-black/20" />

                {/* Page Edge Effect */}
                <div className="absolute inset-y-2 right-1.5 w-0.5 bg-white/30 rounded-full" />
                <div className="absolute inset-y-2 right-2.5 w-0.5 bg-white/20 rounded-full" />

                {/* Hover Overlay */}
                <div
                    className={cn(
                        "absolute inset-0 bg-black/0 group-hover:bg-black/30",
                        "transition-all duration-300",
                        "flex items-center justify-center opacity-0 group-hover:opacity-100"
                    )}
                >
                    <span className="px-4 py-2 bg-white/90 rounded-md text-sm font-medium text-gray-900 shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                        Open
                    </span>
                </div>

                {/* Title Label */}
                <div className="absolute inset-x-0 bottom-0 p-4">
                    <div
                        className={cn(
                            "backdrop-blur-sm rounded-lg px-3 py-2",
                            cover.textColor === "light"
                                ? "bg-black/30 text-white"
                                : "bg-white/70 text-gray-900"
                        )}
                    >
                        <h3 className="font-semibold text-sm truncate">{title}</h3>
                        <div className="flex items-center justify-between text-xs opacity-80 mt-0.5">
                            <span>
                                {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
                            </span>
                            {notesCount > 0 && (
                                <span>
                                    {notesCount} note{notesCount !== 1 ? "s" : ""}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
