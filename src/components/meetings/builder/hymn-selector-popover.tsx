"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Hymn {
    id: string;
    hymn_number: number;
    title: string;
    book_id: string;
    topic: string | null;
    language: string;
}

interface HymnSelectorPopoverProps {
    children: React.ReactNode;
    currentHymnId?: string;
    onSelect: (hymn: { id: string; number: number; title: string }) => void;
}

const ENG_HYMNBOOKS = [
    { id: "hymns_church", name: "Hymns of The Church of Jesus Christ of Latter-day Saints" },
    { id: "hymns_home_church", name: "Hymns—For Home and Church" }
];

const SPA_HYMNBOOKS = [
    { id: "himnos_iglesia", name: "Himnos de La Iglesia de Jesucristo de los Santos de los Últimos Días" },
    { id: "himnos_hogar_iglesia", name: "Himnos — Para el hogar y la Iglesia" }
];

export function HymnSelectorPopover({
    children,
    currentHymnId,
    onSelect,
}: HymnSelectorPopoverProps) {
    const [open, setOpen] = useState(false);
    const [hymns, setHymns] = useState<Hymn[]>([]);

    // Filters
    const [selectedLanguage, setSelectedLanguage] = useState("ENG");
    const [selectedBook, setSelectedBook] = useState("hymns_home_church"); // Default
    const [selectedTopic, setSelectedTopic] = useState("all");
    const [search, setSearch] = useState("");

    const currentBooks = selectedLanguage === "ENG" ? ENG_HYMNBOOKS : SPA_HYMNBOOKS;

    // Switch equivalent book id when language changes
    useEffect(() => {
        setSelectedBook(prev => {
            if (selectedLanguage === "SPA") {
                if (prev === "hymns_church") return "himnos_iglesia";
                if (prev === "hymns_home_church") return "himnos_hogar_iglesia";
            } else {
                if (prev === "himnos_iglesia") return "hymns_church";
                if (prev === "himnos_hogar_iglesia") return "hymns_home_church";
            }
            return prev;
        });
    }, [selectedLanguage]);

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
            .select("id, hymn_number, title, book_id, topic, language")
            .order("hymn_number");

        if (!error && data) {
            setHymns(data);
        }
        setIsLoading(false);
    };

    // Filter available topics based on selected book and language
    const availableTopics = useMemo(() => {
        const bookHymns = hymns.filter(h => h.book_id === selectedBook && h.language === selectedLanguage);
        const uniqueTopics = Array.from(new Set(bookHymns.map(h => h.topic).filter(Boolean))) as string[];
        return uniqueTopics.sort();
    }, [hymns, selectedBook, selectedLanguage]);

    // Ensure selected topic is valid for the new book when book changes
    useEffect(() => {
        if (selectedTopic !== "all" && !availableTopics.includes(selectedTopic)) {
            setSelectedTopic("all");
        }
    }, [selectedBook, selectedLanguage, availableTopics, selectedTopic]);

    const filteredHymns = useMemo(() => {
        let result = hymns.filter((h) => h.book_id === selectedBook && h.language === selectedLanguage);

        if (selectedTopic !== "all") {
            result = result.filter((h) => h.topic === selectedTopic);
        }

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
    }, [hymns, selectedBook, selectedLanguage, selectedTopic, search]);

    const handleSelect = (hymn: Hymn) => {
        onSelect({
            id: hymn.id,
            number: hymn.hymn_number,
            title: hymn.title,
        });
        setOpen(false);
    };

    const getHymnBookLogo = (bookId: string) => {
        const logos: Record<string, { src: string; alt: string }> = {
            'hymns_church': {
                src: '/images/lds-hymns.svg',
                alt: 'LDS Hymns'
            },
            'himnos_iglesia': {
                src: '/images/lds-hymns.svg',
                alt: 'LDS Hymns'
            },
            'hymns_home_church': {
                src: '/images/home-church.svg',
                alt: 'Home Church Collection'
            },
            'himnos_hogar_iglesia': {
                src: '/images/home-church.svg',
                alt: 'Home Church Collection'
            }
        };
        return logos[bookId] || { src: '/images/lds-hymns.svg', alt: 'Hymnal' };
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent side="left" align="start" className="w-[380px] p-4 flex flex-col gap-4 shadow-xl mb-4 ml-4">

                <div className="space-y-3">
                    <div className="grid grid-cols-[70px_1fr] gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Lang</label>
                            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                                <SelectTrigger className="h-9 w-full">
                                    <SelectValue placeholder="Lang" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ENG">ENG</SelectItem>
                                    <SelectItem value="SPA">SPA</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1 min-w-0">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Hymnbook</label>
                            <Select value={selectedBook} onValueChange={setSelectedBook}>
                                <SelectTrigger className="h-9 w-full">
                                    <div className="truncate text-left w-full">
                                        <SelectValue placeholder="Select a book" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    {currentBooks.map(book => (
                                        <SelectItem key={book.id} value={book.id}>
                                            {book.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Topic</label>
                        <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                            <SelectTrigger className="h-9 w-full">
                                <SelectValue placeholder="All Topics" />
                            </SelectTrigger>
                            <SelectContent className="max-h-80">
                                <SelectItem value="all">All Topics</SelectItem>
                                {availableTopics.map(topic => (
                                    <SelectItem key={topic} value={topic}>
                                        {topic}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Search</label>
                        <div className="relative">
                            <MagnifyingGlassIcon weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Number or title..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-9"
                                autoFocus={open}
                            />
                        </div>
                    </div>
                </div>

                <ScrollArea className="h-[280px] border-t pt-2 w-full">
                    {isLoading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center h-full">
                            Loading hymns...
                        </div>
                    ) : filteredHymns.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center h-full">
                            No hymns found
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1 pr-3">
                            {filteredHymns.map((hymn) => {
                                const logo = getHymnBookLogo(hymn.book_id);
                                return (
                                    <button
                                        key={hymn.id}
                                        onClick={() => handleSelect(hymn)}
                                        className={cn(
                                            "w-full text-left p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-3 text-sm group",
                                            currentHymnId === hymn.id && "bg-accent/50 text-accent-foreground font-medium border border-border"
                                        )}
                                    >
                                        <div className="relative w-5 h-5 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity hidden sm:block">
                                            <Image
                                                src={logo.src}
                                                alt={logo.alt}
                                                width={20}
                                                height={20}
                                                className="object-contain"
                                            />
                                        </div>
                                        <span className="font-mono text-muted-foreground w-12 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity text-[13px]">
                                            #{hymn.hymn_number}
                                        </span>
                                        <span className="truncate flex-1">
                                            {hymn.title}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>

            </PopoverContent>
        </Popover>
    );
}
