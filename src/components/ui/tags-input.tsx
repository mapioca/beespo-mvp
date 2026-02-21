"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface TagsInputProps {
    tags: string[];
    onTagsChange: (tags: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    helperText?: string;
}

export function TagsInput({
    tags,
    onTagsChange,
    placeholder,
    disabled = false,
    className,
    helperText,
}: TagsInputProps) {
    const t = useTranslations('UI.TagsInput');
    const [tagInput, setTagInput] = useState("");

    const handleAddTag = () => {
        const trimmedTag = tagInput.trim();
        if (trimmedTag && !tags.includes(trimmedTag)) {
            onTagsChange([...tags, trimmedTag]);
            setTagInput("");
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        onTagsChange(tags.filter(tag => tag !== tagToRemove));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAddTag();
        }
    };

    return (
        <div className={className}>
            <div className="space-y-2">
                <div className="flex gap-2">
                    <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder || t("placeholder")}
                        disabled={disabled}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddTag}
                        disabled={!tagInput.trim() || disabled}
                    >
                        {t("add")}
                    </Button>
                </div>
                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                                {tag}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveTag(tag)}
                                    className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                                    disabled={disabled}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}
                {helperText && (
                    <p className="text-xs text-muted-foreground">
                        {helperText}
                    </p>
                )}
            </div>
        </div>
    );
}
