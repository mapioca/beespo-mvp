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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search, Music } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Hymn {
    id: string;
    hymn_number: number;
    title: string;
    book_id: string;
    language: string;
}

interface HymnSelectorModalProps {
    open: boolean;
    onClose: () => void;
    onSelect: (hymn: { id: string; number: number; title: string }) => void;
    currentHymnId?: string;
    defaultLanguage?: "ENG" | "SPA";
}

export function HymnSelectorModal({
    open,
    onClose,
    onSelect,
    currentHymnId,
    defaultLanguage = "ENG",
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

    const loadHymns = async () => {
        setIsLoading(true);
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from("hymns") as any)
            .select("id, hymn_number, title, book_id, language")
            .order("hymn_number");

        if (!error && data) {
            setHymns(data);
        }
        setIsLoading(false);
    };

    const filteredHymns = useMemo(() => {
        let result = hymns.filter((h) => h.language === selectedLanguage);

        if (search.trim()) {
            const searchLower = search.toLowerCase();
            const searchNum = parseInt(search);
            result = result.filter((h) => {
                if (!isNaN(searchNum) && h.hymn_number === searchNum) return true;
                if (h.hymn_number.toString().startsWith(search)) return true;
                return h.title.toLowerCase().includes(searchLower);
            });
        }

        return result;
    }, [hymns, selectedLanguage, search]);

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
            },
            'himnos_iglesia': {
                src: '/images/lds-hymns.svg',
                alt: 'LDS Himnos'
            },
            'himnos_hogar_iglesia': {
                src: '/images/home-church.svg',
                alt: 'Colección Hogar e Iglesia'
            },
        };
        return logos[bookId] || { src: '/images/lds-hymns.svg', alt: 'Hymnal' };
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Music className="h-5 w-5 text-blue-500" />
                        {selectedLanguage === "SPA" ? "Seleccionar Himno" : "Select Hymn"}
                    </DialogTitle>
                    <DialogDescription>
                        {selectedLanguage === "SPA" ? "Buscar por número o título" : "Search by hymn number or title"}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={selectedLanguage === "SPA" ? "Número o título..." : "Search hymns..."}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                            autoFocus
                        />
                    </div>
                    <Select value={selectedLanguage} onValueChange={(v) => { setSelectedLanguage(v as "ENG" | "SPA"); setSearch(""); }}>
                        <SelectTrigger className="w-20 shrink-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ENG">ENG</SelectItem>
                            <SelectItem value="SPA">SPA</SelectItem>
                        </SelectContent>
                    </Select>
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
