"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Pencil, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InlineInputProps {
    value: string;
    onSave: (value: string) => Promise<boolean>;
    placeholder?: string;
    type?: "text" | "number";
    disabled?: boolean;
    className?: string;
    inputClassName?: string;
    displayClassName?: string;
    emptyText?: string;
    suffix?: string;
    min?: number;
    max?: number;
}

export function InlineInput({
    value: initialValue,
    onSave,
    placeholder = "Click to edit...",
    type = "text",
    disabled = false,
    className,
    inputClassName,
    displayClassName,
    emptyText = "Not set",
    suffix,
    min,
    max,
}: InlineInputProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue);
    const [isSaving, setIsSaving] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync with external value changes
    useEffect(() => {
        if (!isEditing) {
            setValue(initialValue);
        }
    }, [initialValue, isEditing]);

    // Auto-focus when entering edit mode
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = useCallback(async () => {
        const trimmedValue = value.trim();

        // If value hasn't changed, just exit edit mode
        if (trimmedValue === initialValue) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);
        const success = await onSave(trimmedValue);
        setIsSaving(false);

        if (success) {
            setIsEditing(false);
        } else {
            // Revert on failure
            setValue(initialValue);
            setIsEditing(false);
        }
    }, [value, initialValue, onSave]);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSave();
        } else if (e.key === "Escape") {
            setValue(initialValue);
            setIsEditing(false);
        }
    };

    const handleClick = () => {
        if (!disabled && !isSaving) {
            setIsEditing(true);
        }
    };

    if (disabled) {
        return (
            <span className={cn("text-sm", displayClassName)}>
                {initialValue || emptyText}
                {suffix && initialValue && <span className="text-muted-foreground">{suffix}</span>}
            </span>
        );
    }

    if (isEditing) {
        return (
            <div className={cn("relative inline-flex items-center", className)}>
                <Input
                    ref={inputRef}
                    type={type}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    disabled={isSaving}
                    placeholder={placeholder}
                    min={min}
                    max={max}
                    className={cn(
                        "h-7 text-sm px-2 py-1",
                        type === "number" && "w-16",
                        isSaving && "opacity-50",
                        inputClassName
                    )}
                />
                {isSaving && (
                    <Loader2 className="h-3 w-3 animate-spin ml-1 text-muted-foreground" />
                )}
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 -mx-1.5 rounded text-sm",
                "hover:bg-muted transition-colors cursor-pointer text-left",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                className
            )}
        >
            <span className={cn(
                !initialValue && "text-muted-foreground italic",
                displayClassName
            )}>
                {initialValue || emptyText}
                {suffix && initialValue && (
                    <span className="text-muted-foreground">{suffix}</span>
                )}
            </span>
            {isHovered && (
                <Pencil className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
        </button>
    );
}
