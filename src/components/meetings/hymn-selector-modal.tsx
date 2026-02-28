"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MagnifyingGlassIcon, MusicNoteIcon } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Hymn {
    id: string;
    hymn_number: number;
    title: string;
    book_id: string;
}

interface HymnSelectorModalProps {
    open: boolean;
    onClose: () => void;
    onSelect: (hymn: { id: string; number: number; title: string }) => void;
    currentHymnId?: string;
}

export function HymnSelectorModal({
    open,
    onClose,
    onSelect,
    currentHymnId,
}: HymnSelectorModalProps) {
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

        if (!error && data) {
            setHymns(data);
        }
        setIsLoading(false);
    };

    const filteredHymns = useMemo(() => {
        if (!search.trim()) return hymns;

        const searchLower = search.toLowerCase();
        const searchNum = parseInt(search);

        return hymns.filter((h) => {
            if (!isNaN(searchNum) && h.hymn_number === searchNum) return true;
            if (h.hymn_number.toString().startsWith(search)) return true;
            return h.title.toLowerCase().includes(searchLower);
        });
    }, [hymns, search]);

    const handleSelect = (hymn: Hymn) => {
        onSelect({
            id: hymn.id,
            number: hymn.hymn_number,
            title: hymn.title,
        });
        onClose();
    };

    const getHymnBookLogo = (bookId: string) => {
        const logos: Record<string, { src: string; alt: string }> = {
            'hymns_church': {
                src: '/images/lds-hymns.svg',
                alt: 'LDS Hymns'
            },
            'hymns_home_church': {
                src: '/images/home-church.svg',
                alt: 'Home Church Collection'
            }
        };
        return logos[bookId] || { src: '/images/lds-hymns.svg', alt: 'Hymnal' };
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MusicNoteIcon weight="fill" className="h-5 w-5 text-blue-500" />
                        Select Hymn
                    </DialogTitle>
                    <DialogDescription>
                        Search by hymn number or title
                    </DialogDescription>
                </DialogHeader>

                <div className="relative">
                    <MagnifyingGlassIcon weight="fill" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search hymns..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                        autoFocus
                    />
                </div>

                <ScrollArea className="h-[300px] border rounded-md">
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
                            {filteredHymns.map((hymn) => {
                                const logo = getHymnBookLogo(hymn.book_id);
                                return (
                                    <button
                                        key={hymn.id}
                                        onClick={() => handleSelect(hymn)}
                                        className={cn(
                                            "w-full text-left p-3 hover:bg-accent transition-colors flex items-center gap-3",
                                            currentHymnId === hymn.id && "bg-accent"
                                        )}
                                    >
                                        <div className="relative w-6 h-6 flex-shrink-0">
                                            <Image
                                                src={logo.src}
                                                alt={logo.alt}
                                                width={24}
                                                height={24}
                                                className="object-contain"
                                            />
                                        </div>
                                        <span className="font-mono text-sm text-muted-foreground w-8">
                                            #{hymn.hymn_number}
                                        </span>
                                        <span className="font-medium truncate">
                                            {hymn.title}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>

                <div className="flex justify-end">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
