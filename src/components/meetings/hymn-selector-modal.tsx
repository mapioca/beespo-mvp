"use client";

import { useState, useEffect, useMemo } from "react";
import { PickerModal } from "@/components/ui/picker-modal";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Hymn {
    id: string;
    hymn_number: number;
    title: string;
    book_id: string;
    language: string;
    topic?: string | null;
}

interface HymnSelectorModalProps {
    open: boolean;
    onClose: () => void;
    onSelect: (hymn: { id: string; number: number; title: string }) => void;
    currentHymnId?: string;
    defaultLanguage?: "ENG" | "SPA";
    sacramentOnly?: boolean;
}

export function HymnSelectorModal({
    open,
    onClose,
    onSelect,
    currentHymnId,
    defaultLanguage = "ENG",
    sacramentOnly = false,
}: HymnSelectorModalProps) {
    const [hymns, setHymns] = useState<Hymn[]>([]);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState<"ENG" | "SPA">(defaultLanguage);

    useEffect(() => {
        if (open && hymns.length === 0) {
            loadHymns();
        }
    }, [open, hymns.length]);

    useEffect(() => {
        if (open) {
            setSelectedLanguage(defaultLanguage);
            setSearch("");
        }
    }, [open, defaultLanguage]);

    const loadHymns = async () => {
        setIsLoading(true);
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from("hymns") as any)
            .select("id, hymn_number, title, book_id, language, topic")
            .order("hymn_number");

        if (!error && data) {
            setHymns(data);
        }
        setIsLoading(false);
    };

    const filteredHymns = useMemo(() => {
        let result = hymns.filter((h) => h.language === selectedLanguage);

        if (sacramentOnly) {
            result = result.filter((h) => {
                const topic = h.topic?.toLowerCase() ?? "";
                return (
                    topic.includes("sacrament") ||
                    topic.includes("santa cena") ||
                    (h.language === "ENG" && h.hymn_number >= 169 && h.hymn_number <= 196) ||
                    (h.language === "SPA" && h.hymn_number >= 101 && h.hymn_number <= 120)
                );
            });
        }

        if (search.trim()) {
            const searchLower = search.toLowerCase();
            const searchNum = parseInt(search);
            result = result.filter((h) => {
                if (!isNaN(searchNum) && h.hymn_number === searchNum) return true;
                if (h.hymn_number.toString().startsWith(search)) return true;
                if (h.title.toLowerCase().includes(searchLower)) return true;
                return (h.topic ?? "").toLowerCase().includes(searchLower);
            });
        }

        return result;
    }, [hymns, selectedLanguage, search, sacramentOnly]);

    const handleSelect = (hymn: Hymn) => {
        onSelect({
            id: hymn.id,
            number: hymn.hymn_number,
            title: hymn.title,
        });
        onClose();
    };

    const title = selectedLanguage === "SPA"
        ? sacramentOnly ? "Elegir himno sacramental" : "Elegir himno"
        : sacramentOnly ? "Choose sacrament hymn" : "Choose hymn";
    const placeholder = selectedLanguage === "SPA"
        ? sacramentOnly ? "Buscar himnos sacramentales..." : "Buscar por número, título o tema..."
        : sacramentOnly ? "Search sacrament hymns..." : "Search by number, title, or topic...";

    const getBookLabel = (bookId: string) => {
        if (bookId.includes("home") || bookId.includes("hogar")) return "Home"
        return selectedLanguage === "SPA" ? "Himnos" : "Hymns"
    };

    return (
        <PickerModal
            open={open}
            onOpenChange={(o) => !o && onClose()}
            title={title}
            maxWidth="max-w-[560px]"
            searchSlot={
                <>
                    <input
                        className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
                        placeholder={placeholder}
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        autoFocus
                    />
                    <Select
                        value={selectedLanguage}
                        onValueChange={(value) => {
                            setSelectedLanguage(value as "ENG" | "SPA");
                            setSearch("");
                        }}
                    >
                        <SelectTrigger className="h-auto w-20 shrink-0 rounded-none border-0 border-l border-border/70 bg-transparent px-3 shadow-none focus:ring-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ENG">ENG</SelectItem>
                            <SelectItem value="SPA">SPA</SelectItem>
                        </SelectContent>
                    </Select>
                </>
            }
        >
                    {isLoading ? (
                        <div className="p-8 text-center text-[13px] text-muted-foreground">
                            Loading hymns...
                        </div>
                    ) : filteredHymns.length === 0 ? (
                        <div className="p-8 text-center text-[13px] text-muted-foreground">
                            No hymns found
                        </div>
                    ) : (
                        <div>
                            {filteredHymns.map((hymn) => {
                                return (
                                    <button
                                        key={hymn.id}
                                        type="button"
                                        onClick={() => handleSelect(hymn)}
                                        className={cn(
                                            "grid w-full grid-cols-[48px_1fr_auto] items-center gap-2.5 px-[18px] py-2.5 text-left transition-colors hover:bg-[#f7f6f4] dark:hover:bg-surface-hover",
                                            currentHymnId === hymn.id && "bg-[#f7f6f4] dark:bg-surface-hover"
                                        )}
                                    >
                                        <div className="font-serif text-[15px] italic text-brand">
                                            № {hymn.hymn_number}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="truncate font-serif text-[14.5px] text-foreground">
                                                {hymn.title}
                                            </div>
                                        </div>
                                        {hymn.topic ? (
                                            <div className="truncate rounded-full border border-muted-foreground/30 px-2 py-0.5 text-[11px] text-muted-foreground">
                                                {hymn.topic}
                                            </div>
                                        ) : (
                                            <div className="rounded-full border border-muted-foreground/30 px-2 py-0.5 text-[10.5px] uppercase tracking-[0.04em] text-muted-foreground">
                                                {getBookLabel(hymn.book_id)}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
        </PickerModal>
    );
}
