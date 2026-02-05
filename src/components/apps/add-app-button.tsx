"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

interface AddAppButtonProps {
    isCollapsed: boolean;
}

export function AddAppButton({ isCollapsed }: AddAppButtonProps) {
    return (
        <Link
            href="/apps"
            className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                isCollapsed && "justify-center px-2"
            )}
        >
            <Plus className="h-4 w-4" />
            {!isCollapsed && <span>Browse Apps</span>}
        </Link>
    );
}
