"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================================
   AutoSaveTextarea - Reusable "Invisible Input" Component

   Pattern: Click-to-Edit, Save-on-Blur
   - Looks like regular text when idle (transparent bg, no border)
   - Shows subtle focus ring when active
   - Auto-saves on blur if value changed
   - Auto-resizes to fit content
============================================ */
export interface AutoSaveTextareaProps {
    initialValue: string;
    onSave: (value: string) => Promise<void>;
    placeholder?: string;
    disabled?: boolean;
    minRows?: number;
    className?: string;
}

export function AutoSaveTextarea({
    initialValue,
    onSave,
    placeholder = "Click to edit...",
    disabled = false,
    minRows = 1,
    className,
}: AutoSaveTextareaProps) {
    const [value, setValue] = useState(initialValue);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const initialValueRef = useRef(initialValue);

    // Sync local state when initialValue prop changes (external updates)
    useEffect(() => {
        if (initialValue !== initialValueRef.current) {
            setValue(initialValue);
            initialValueRef.current = initialValue;
            setHasUnsavedChanges(false);
        }
    }, [initialValue]);

    // Auto-resize textarea to fit content
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            // Reset height to recalculate
            textarea.style.height = "auto";
            // Set to scrollHeight for auto-grow
            textarea.style.height = `${Math.max(textarea.scrollHeight, minRows * 24)}px`;
        }
    }, [value, minRows]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setValue(e.target.value);
        setHasUnsavedChanges(e.target.value !== initialValueRef.current);
    };

    const handleBlur = async () => {
        // Only save if value actually changed
        if (!hasUnsavedChanges || value === initialValueRef.current) {
            return;
        }

        setIsSaving(true);
        try {
            await onSave(value);
            initialValueRef.current = value;
            setHasUnsavedChanges(false);
        } catch {
            // Revert to last saved value on error
            setValue(initialValueRef.current);
            setHasUnsavedChanges(false);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="relative group">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={placeholder}
                disabled={disabled || isSaving}
                rows={minRows}
                className={cn(
                    // Base styles - "invisible" look
                    "w-full resize-none bg-transparent text-sm leading-relaxed",
                    "text-foreground placeholder:text-muted-foreground",
                    // Border: invisible by default, subtle on hover/focus
                    "border border-transparent rounded-md",
                    "hover:border-border/50 hover:bg-muted/30",
                    // Focus: visible ring for accessibility
                    "focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-transparent focus:bg-muted/30",
                    // Padding with negative margin for larger click target
                    "p-2 -m-2",
                    // Transitions
                    "transition-all duration-150",
                    // Disabled/Saving states
                    disabled && "cursor-not-allowed opacity-60",
                    isSaving && "opacity-50",
                    className
                )}
            />
            {/* Saving indicator */}
            {isSaving && (
                <div className="absolute right-0 top-0 p-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
            )}
            {/* Unsaved changes indicator (subtle dot) */}
            {hasUnsavedChanges && !isSaving && (
                <div className="absolute right-0 top-0 p-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500" title="Unsaved changes" />
                </div>
            )}
        </div>
    );
}
