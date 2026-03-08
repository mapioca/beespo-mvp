"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Search, Star } from "lucide-react";

// Cache all lucide icon names.
// Lucide icons are created with React.forwardRef, so typeof returns "object", not "function".
// We filter to uppercase-named, non-null exports and exclude helpers like createLucideIcon.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const allIconNames = Object.keys(LucideIcons).filter((name) => {
    if (!/^[A-Z]/.test(name)) return false;
    if (name === "createLucideIcon") return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exp = (LucideIcons as any)[name];
    return exp != null && (typeof exp === "function" || typeof exp === "object");
}).sort();

export interface IconPickerProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export function IconPicker({ value, onChange, disabled }: IconPickerProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [visibleCount, setVisibleCount] = useState(100);
    const observerRef = useRef<HTMLDivElement>(null);

    const filteredIcons = useMemo(() => {
        if (!search.trim()) return allIconNames;
        const lowerSearch = search.toLowerCase();
        return allIconNames.filter((name) =>
            name.toLowerCase().includes(lowerSearch)
        );
    }, [search]);

    // Reset visible count when search changes
    useEffect(() => {
        setVisibleCount(100);
    }, [search]);

    // Intersection Observer to load more icons when scrolling
    useEffect(() => {
        if (!open) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setVisibleCount((prev) =>
                        Math.min(prev + 100, filteredIcons.length)
                    );
                }
            },
            { threshold: 0.1 }
        );

        if (observerRef.current) {
            observer.observe(observerRef.current);
        }

        return () => observer.disconnect();
    }, [open, filteredIcons.length]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = LucideIcons as any;
    const SelectedIcon = (value && L[value]) ? L[value] : Star;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    type="button"
                    disabled={disabled}
                    className="w-[60px] h-10 px-0 flex items-center justify-center border-input bg-background hover:bg-accent hover:text-accent-foreground shrink-0"
                >
                    <SelectedIcon className="h-5 w-5 text-black dark:text-white" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[340px] p-0" align="start">
                <div className="flex items-center border-b px-3">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search icons..."
                        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
                        autoFocus
                    />
                </div>
                <div className="h-72 w-full overflow-y-auto p-2">
                    <div className="grid grid-cols-6 gap-2">
                        {filteredIcons.slice(0, visibleCount).map((iconName) => {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const IconComp = (LucideIcons as any)[iconName];
                            return (
                                <Button
                                    key={iconName}
                                    variant="ghost"
                                    type="button"
                                    size="icon"
                                    className={`h-10 w-10 ${value === iconName ? "bg-accent text-accent-foreground" : ""
                                        }`}
                                    onClick={() => {
                                        onChange(iconName);
                                        setOpen(false);
                                    }}
                                    title={iconName}
                                >
                                    <IconComp className="h-5 w-5 text-black dark:text-white" />
                                </Button>
                            );
                        })}
                    </div>
                    {visibleCount < filteredIcons.length && (
                        <div ref={observerRef} className="h-4 w-full" />
                    )}
                    {filteredIcons.length === 0 && (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            No icons found.
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

// Default export for next/dynamic
export default IconPicker;
