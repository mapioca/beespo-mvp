"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Pencil, Loader2, Check, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
    id: string;
    label: string;
    sublabel?: string;
    icon?: React.ReactNode;
}

export interface InlineComboboxProps {
    value: ComboboxOption | null;
    options: ComboboxOption[];
    onSelect: (option: ComboboxOption | null) => Promise<boolean>;
    onSearch?: (query: string) => void;
    onCreateNew?: (name: string) => Promise<ComboboxOption | null>;
    placeholder?: string;
    emptyText?: string;
    searchPlaceholder?: string;
    noResultsText?: string;
    disabled?: boolean;
    isLoading?: boolean;
    className?: string;
    displayClassName?: string;
    icon?: React.ReactNode;
    showClearButton?: boolean;
    /** Compact mode: icon-only button with tooltip when unassigned */
    compact?: boolean;
    /** Tooltip text for compact mode */
    tooltipText?: string;
}

export function InlineCombobox({
    value,
    options,
    onSelect,
    onSearch,
    onCreateNew,
    emptyText = "Not set",
    searchPlaceholder = "Search...",
    noResultsText = "No results found",
    disabled = false,
    isLoading = false,
    className,
    displayClassName,
    icon,
    showClearButton = true,
    compact = false,
    tooltipText,
}: InlineComboboxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [isCreating, setIsCreating] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter options based on search
    const filteredOptions = options.filter(
        (opt) =>
            opt.label.toLowerCase().includes(search.toLowerCase()) ||
            opt.sublabel?.toLowerCase().includes(search.toLowerCase())
    );

    // Reset highlight when filtered options change
    useEffect(() => {
        setHighlightedIndex(0);
    }, [filteredOptions.length, search]);

    // Auto-focus when opening
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearch("");
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [isOpen]);

    const handleSelect = useCallback(async (option: ComboboxOption | null) => {
        setIsSaving(true);
        const success = await onSelect(option);
        setIsSaving(false);

        if (success) {
            setIsOpen(false);
            setSearch("");
        }
    }, [onSelect]);

    const handleClear = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        await handleSelect(null);
    }, [handleSelect]);

    const handleCreateNew = useCallback(async () => {
        if (!onCreateNew || !search.trim()) return;

        setIsCreating(true);
        const newOption = await onCreateNew(search.trim());
        setIsCreating(false);

        if (newOption) {
            await handleSelect(newOption);
        }
    }, [onCreateNew, search, handleSelect]);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((prev) =>
                Math.min(prev + 1, filteredOptions.length - 1)
            );
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (filteredOptions[highlightedIndex]) {
                handleSelect(filteredOptions[highlightedIndex]);
            } else if (onCreateNew && search.trim()) {
                handleCreateNew();
            }
        } else if (e.key === "Escape") {
            setIsOpen(false);
            setSearch("");
        }
    };

    const handleSearchChange = (query: string) => {
        setSearch(query);
        onSearch?.(query);
    };

    const handleClick = () => {
        if (!disabled && !isSaving) {
            setIsOpen(true);
        }
    };

    if (disabled) {
        return (
            <span className={cn("inline-flex items-center gap-1.5 text-sm", displayClassName)}>
                {icon}
                <span>{value?.label || emptyText}</span>
            </span>
        );
    }

    if (isOpen) {
        return (
            <div ref={containerRef} className={cn("relative", className)}>
                <div className="min-w-[200px] bg-popover border rounded-md shadow-md">
                    <div className="p-2 border-b">
                        <Input
                            ref={inputRef}
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={searchPlaceholder}
                            className="h-8 text-sm"
                            disabled={isSaving || isCreating}
                        />
                    </div>
                    <ScrollArea className="max-h-[200px]">
                        {isLoading ? (
                            <div className="p-3 text-center text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                                Loading...
                            </div>
                        ) : filteredOptions.length === 0 && !search ? (
                            <div className="p-3 text-center text-sm text-muted-foreground">
                                {noResultsText}
                            </div>
                        ) : filteredOptions.length === 0 ? (
                            <div className="p-3 text-center text-sm text-muted-foreground">
                                No matches found
                            </div>
                        ) : (
                            <div className="py-1">
                                {filteredOptions.map((option, index) => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => handleSelect(option)}
                                        disabled={isSaving}
                                        className={cn(
                                            "w-full text-left px-3 py-2 text-sm flex items-center gap-2",
                                            "hover:bg-accent transition-colors",
                                            highlightedIndex === index && "bg-accent",
                                            value?.id === option.id && "font-medium",
                                            isSaving && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        <Check
                                            className={cn(
                                                "h-4 w-4 shrink-0",
                                                value?.id === option.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {option.icon}
                                        <div className="flex-1 min-w-0">
                                            <span className="block truncate">{option.label}</span>
                                            {option.sublabel && (
                                                <span className="block text-xs text-muted-foreground truncate">
                                                    {option.sublabel}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                    <div className="border-t p-1 space-y-1">
                        {onCreateNew && search.trim() && (
                            <button
                                type="button"
                                onClick={handleCreateNew}
                                disabled={isCreating}
                                className={cn(
                                    "w-full text-left px-3 py-2 text-sm flex items-center gap-2",
                                    "hover:bg-accent transition-colors rounded",
                                    isCreating && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {isCreating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Plus className="h-4 w-4" />
                                )}
                                <span>Create &quot;{search.trim()}&quot;</span>
                            </button>
                        )}
                        {showClearButton && value && (
                            <button
                                type="button"
                                onClick={handleClear}
                                disabled={isSaving}
                                className={cn(
                                    "w-full text-left px-3 py-2 text-sm flex items-center gap-2",
                                    "text-muted-foreground hover:bg-accent transition-colors rounded",
                                    isSaving && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                <X className="h-4 w-4" />
                                <span>Clear selection</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Compact mode for unassigned state: icon-only button with tooltip
    if (compact && !value) {
        return (
            <TooltipProvider delayDuration={300}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            onClick={handleClick}
                            disabled={isSaving}
                            className={cn(
                                "inline-flex items-center justify-center gap-0.5 rounded-full",
                                "h-7 w-7 p-0",
                                "text-muted-foreground/60 hover:text-muted-foreground",
                                "hover:bg-muted transition-colors cursor-pointer",
                                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                                isSaving && "opacity-50 cursor-not-allowed",
                                className
                            )}
                        >
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Plus className="h-2.5 w-2.5" />
                                    <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
                                </>
                            )}
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                        <p>{tooltipText || emptyText}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            disabled={isSaving}
            className={cn(
                "inline-flex items-center gap-1.5 px-1.5 py-0.5 -mx-1.5 rounded text-sm",
                "hover:bg-muted transition-colors cursor-pointer text-left",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                isSaving && "opacity-50 cursor-not-allowed",
                className
            )}
        >
            {icon}
            <span className={cn(
                !value && "text-muted-foreground italic",
                displayClassName
            )}>
                {value?.label || emptyText}
            </span>
            {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />
            ) : isHovered ? (
                <Pencil className="h-3 w-3 text-muted-foreground shrink-0" />
            ) : null}
        </button>
    );
}
