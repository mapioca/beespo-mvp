"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Music, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Hymn {
    id: string;
    hymn_number: number;
    title: string;
    book_id: string;
}

export interface HymnSelection {
    id: string;
    number: number;
    title: string;
}

interface HymnPopoverProps {
    currentHymnId?: string | null;
    currentHymnTitle?: string | null;
    currentHymnNumber?: number | null;
    onSelect: (hymn: HymnSelection | null) => void;
    trigger?: React.ReactNode;
    disabled?: boolean;
}

// Hymn book logos
const getHymnBookLogo = (bookId: string) => {
    const logos: Record<string, { src: string; alt: string }> = {
        hymns_church: {
            src: "/images/lds-hymns.svg",
            alt: "LDS Hymns",
        },
        hymns_home_church: {
            src: "/images/home-church.svg",
            alt: "Home Church Collection",
        },
    };
    return logos[bookId] || { src: "/images/lds-hymns.svg", alt: "Hymnal" };
};

export function HymnPopover({
    currentHymnId,
    currentHymnTitle,
    currentHymnNumber,
    onSelect,
    trigger,
    disabled = false,
}: HymnPopoverProps) {
    const [open, setOpen] = useState(false);
    const [hymns, setHymns] = useState<Hymn[]>([]);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open && hymns.length === 0) {
            loadHymns();
        }
    }, [open, hymns.length]);

    const loadHymns = async () => {
        setIsLoading(true);
        const supabase = createClient();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from("hymns") as any)
            .select("id, hymn_number, title, book_id")
            .order("hymn_number");

        if (error) {
            console.error("Error loading hymns:", error);
        } else {
            setHymns(data || []);
        }
        setIsLoading(false);
    };

    const filteredHymns = useMemo(() => {
        const searchLower = search.toLowerCase().trim();
        const searchNum = parseInt(search);

        return hymns.filter((h) => {
            if (!searchLower) return true;
            if (!isNaN(searchNum) && h.hymn_number === searchNum) return true;
            if (h.hymn_number.toString().startsWith(search)) return true;
            return h.title.toLowerCase().includes(searchLower);
        });
    }, [hymns, search]);

    const handleClear = () => {
        onSelect(null);
        setOpen(false);
    };

    const defaultTrigger = (
        <button
            className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm",
                "hover:bg-muted transition-colors cursor-pointer",
                "border border-transparent hover:border-border",
                disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled}
        >
            <Music className="h-3.5 w-3.5 text-muted-foreground" />
            {currentHymnTitle ? (
                <span className="text-foreground">
                    #{currentHymnNumber} - {currentHymnTitle}
                </span>
            ) : (
                <span className="text-muted-foreground">Select hymn</span>
            )}
        </button>
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {trigger || defaultTrigger}
            </PopoverTrigger>
            <PopoverContent className="w-[340px] p-0" align="start">
                <div className="p-2 border-b">
                    <Input
                        placeholder="Search by number or title..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-8"
                        autoFocus
                    />
                </div>
                <ScrollArea className="h-[280px]">
                    {isLoading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            Loading hymns...
                        </div>
                    ) : filteredHymns.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No hymns found
                        </div>
                    ) : (
                        <div className="divide-y">
                            {filteredHymns.slice(0, 50).map((hymn) => {
                                const logo = getHymnBookLogo(hymn.book_id);
                                return (
                                    <button
                                        key={hymn.id}
                                        onClick={() => {
                                            onSelect({
                                                id: hymn.id,
                                                number: hymn.hymn_number,
                                                title: hymn.title,
                                            });
                                            setOpen(false);
                                            setSearch("");
                                        }}
                                        className={cn(
                                            "w-full text-left p-2 hover:bg-accent transition-colors flex items-center gap-3",
                                            currentHymnId === hymn.id && "bg-accent"
                                        )}
                                    >
                                        <Check
                                            className={cn(
                                                "h-4 w-4 shrink-0",
                                                currentHymnId === hymn.id
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                            )}
                                        />
                                        <div className="relative w-6 h-6 flex-shrink-0">
                                            <Image
                                                src={logo.src}
                                                alt={logo.alt}
                                                width={24}
                                                height={24}
                                                className="object-contain"
                                            />
                                        </div>
                                        <span className="font-mono text-sm text-muted-foreground w-10 shrink-0">
                                            #{hymn.hymn_number}
                                        </span>
                                        <span className="font-medium truncate">
                                            {hymn.title}
                                        </span>
                                    </button>
                                );
                            })}
                            {filteredHymns.length > 50 && (
                                <div className="p-2 text-center text-xs text-muted-foreground">
                                    Showing first 50 results. Type to narrow down.
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>
                {currentHymnId && (
                    <div className="p-2 border-t">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-muted-foreground"
                            onClick={handleClear}
                        >
                            <X className="mr-2 h-4 w-4" />
                            Clear hymn selection
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
