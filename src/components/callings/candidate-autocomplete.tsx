"use client";
import { useTranslations } from "next-intl";

import * as React from "react";
import { Check, ChevronsUpDown, UserPlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { searchCandidateNames, getOrCreateCandidateName } from "@/lib/actions/calling-actions";

interface CandidateName {
    id: string;
    name: string;
}

interface CandidateAutocompleteProps {
    value?: CandidateName | null;
    onChange: (candidate: CandidateName | null) => void;
    placeholder?: string;
    disabled?: boolean;
    excludeIds?: string[];
}

export function CandidateAutocomplete({
    value,
    onChange,
    placeholder = "Search for a name...",
    disabled = false,
    excludeIds = []
}: CandidateAutocompleteProps) {
    const t = useTranslations("Callings.pool.dialogs.addCandidate");
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const [candidates, setCandidates] = React.useState<CandidateName[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [creating, setCreating] = React.useState(false);
    const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

    // Search candidates on input change
    React.useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (search.length < 2) {
            setCandidates([]);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            const result = await searchCandidateNames(search);
            if (result.success && result.candidates) {
                // Filter out excluded IDs
                const filtered = result.candidates.filter(
                    (c: CandidateName) => !excludeIds.includes(c.id)
                );
                setCandidates(filtered);
            }
            setLoading(false);
        }, 300);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [search, excludeIds]);

    const handleSelect = (candidate: CandidateName) => {
        onChange(candidate);
        setOpen(false);
        setSearch("");
    };

    const handleCreateNew = async () => {
        if (!search.trim() || search.length < 2) return;

        setCreating(true);
        const result = await getOrCreateCandidateName(search.trim());
        setCreating(false);

        if (result.success && result.candidate) {
            handleSelect(result.candidate);
        }
    };

    // Check if the current search term exactly matches any existing candidate
    const exactMatch = candidates.some(
        c => c.name.toLowerCase() === search.toLowerCase()
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        "w-full justify-between font-normal",
                        !value && "text-muted-foreground"
                    )}
                >
                    {value ? value.name : (placeholder === "Search for a name..." ? t("placeholder") : placeholder)}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder={t("searchPlaceholder")}
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        {loading ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <>
                                {candidates.length === 0 && search.length >= 2 && !exactMatch && (
                                    <CommandEmpty>{t("noResults")}</CommandEmpty>
                                )}
                                {candidates.length > 0 && (
                                    <CommandGroup heading={t("suggestions")}>
                                        {candidates.map((candidate) => (
                                            <CommandItem
                                                key={candidate.id}
                                                value={candidate.id}
                                                onSelect={() => handleSelect(candidate)}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        value?.id === candidate.id
                                                            ? "opacity-100"
                                                            : "opacity-0"
                                                    )}
                                                />
                                                {candidate.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}
                                {/* Create new option */}
                                {search.length >= 2 && !exactMatch && (
                                    <>
                                        {candidates.length > 0 && <CommandSeparator />}
                                        <CommandGroup>
                                            <CommandItem
                                                onSelect={handleCreateNew}
                                                disabled={creating}
                                                className="text-primary"
                                            >
                                                {creating ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <UserPlus className="mr-2 h-4 w-4" />
                                                )}
                                                {t("addNew", { name: search })}
                                            </CommandItem>
                                        </CommandGroup>
                                    </>
                                )}
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
