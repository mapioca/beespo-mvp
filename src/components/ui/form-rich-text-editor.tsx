"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef, useCallback, useState } from "react";
import { Bold, Italic, Strikethrough, List, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================================
   FormRichTextEditor — TipTap editor for form fields

   Controlled via value/onChange (HTML string).
   Same floating bubble toolbar as RichTextEditor
   but no auto-save / save-status indicator.
============================================ */

interface BubbleButtonProps {
    onClick: () => void;
    isActive?: boolean;
    title: string;
    children: React.ReactNode;
}

function BubbleButton({ onClick, isActive, title, children }: BubbleButtonProps) {
    return (
        <button
            type="button"
            onMouseDown={(e) => {
                e.preventDefault();
                onClick();
            }}
            title={title}
            className={cn(
                "h-7 w-7 flex items-center justify-center rounded transition-colors",
                "text-white/65 hover:text-white hover:bg-white/10",
                isActive && "text-white bg-white/15"
            )}
        >
            {children}
        </button>
    );
}

interface FormRichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    onBlur?: () => void;
    placeholder?: string;
    disabled?: boolean;
    minHeight?: string;
    hasError?: boolean;
}

export function FormRichTextEditor({
    value,
    onChange,
    onBlur,
    placeholder = "Add content...",
    disabled = false,
    minHeight = "7rem",
    hasError = false,
}: FormRichTextEditorProps) {
    const [isFocused, setIsFocused] = useState(false);
    const [bubbleStyle, setBubbleStyle] = useState<React.CSSProperties | null>(null);
    const [, forceRerender] = useState(0);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const bubbleHideTimer = useRef<NodeJS.Timeout | null>(null);

    const updateBubble = useCallback(() => {
        const selection = window.getSelection();
        if (
            !selection ||
            selection.isCollapsed ||
            selection.rangeCount === 0 ||
            !wrapperRef.current
        ) {
            setBubbleStyle(null);
            return;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const wrapperRect = wrapperRef.current.getBoundingClientRect();

        if (rect.width === 0) {
            setBubbleStyle(null);
            return;
        }

        const bubbleWidth = 188;
        let left = rect.left - wrapperRect.left + rect.width / 2 - bubbleWidth / 2;
        left = Math.max(4, Math.min(left, wrapperRect.width - bubbleWidth - 4));

        setBubbleStyle({
            position: "absolute",
            top: rect.top - wrapperRect.top - 44,
            left,
            width: bubbleWidth,
            zIndex: 50,
        });

        forceRerender((n) => n + 1);
    }, []);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: false, codeBlock: false }),
            Placeholder.configure({
                placeholder,
                emptyEditorClass: "is-editor-empty",
            }),
        ],
        content: value,
        editable: !disabled,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        onFocus: () => setIsFocused(true),
        onBlur: () => {
            setIsFocused(false);
            bubbleHideTimer.current = setTimeout(() => setBubbleStyle(null), 150);
            onBlur?.();
        },
        onSelectionUpdate: () => updateBubble(),
        editorProps: {
            attributes: {
                class: cn(
                    "prose-sm max-w-none focus:outline-none text-sm",
                    "px-3 py-2.5",
                    "[&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
                    "[&_ul]:list-disc [&_ul]:ml-4 [&_ul]:my-1",
                    "[&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:my-1",
                    "[&_li]:my-0.5",
                    "[&_strong]:font-semibold",
                    "[&_em]:italic",
                    "[&_s]:line-through"
                ),
            },
        },
    });

    // Sync external value changes into the editor
    useEffect(() => {
        if (!editor) return;
        if (value === editor.getHTML()) return;
        editor.commands.setContent(value);
    }, [value, editor]);

    useEffect(() => () => {
        if (bubbleHideTimer.current) clearTimeout(bubbleHideTimer.current);
    }, []);

    return (
        <div
            ref={wrapperRef}
            style={{ ["--rte-placeholder-size" as string]: "0.875rem" } as React.CSSProperties}
            className={cn(
                "relative rounded-md border transition-all duration-150 bg-background",
                isFocused && !hasError
                    ? "border-ring/50 shadow-[0_0_0_2px_hsl(var(--ring)/0.12)]"
                    : !hasError
                    ? "border-border/60 hover:border-border"
                    : "border-destructive",
                isFocused && hasError && "shadow-[0_0_0_2px_hsl(var(--destructive)/0.12)]",
                disabled && "opacity-60 cursor-not-allowed"
            )}
        >
            {/* Floating bubble toolbar */}
            {editor && bubbleStyle && (
                <div
                    style={bubbleStyle}
                    className={cn(
                        "flex items-center gap-0.5 px-1.5 py-1 rounded-lg pointer-events-auto",
                        "bg-[#1c1c1e] border border-white/10",
                        "shadow-[0_4px_20px_rgba(0,0,0,0.4)]",
                        "animate-in fade-in zoom-in-95 duration-100"
                    )}
                >
                    <BubbleButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        isActive={editor.isActive("bold")}
                        title="Bold (Ctrl+B)"
                    >
                        <Bold className="h-3.5 w-3.5" />
                    </BubbleButton>
                    <BubbleButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        isActive={editor.isActive("italic")}
                        title="Italic (Ctrl+I)"
                    >
                        <Italic className="h-3.5 w-3.5" />
                    </BubbleButton>
                    <BubbleButton
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        isActive={editor.isActive("strike")}
                        title="Strikethrough"
                    >
                        <Strikethrough className="h-3.5 w-3.5" />
                    </BubbleButton>
                    <div className="w-px h-3.5 bg-white/15 mx-0.5" />
                    <BubbleButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        isActive={editor.isActive("bulletList")}
                        title="Bullet list"
                    >
                        <List className="h-3.5 w-3.5" />
                    </BubbleButton>
                    <BubbleButton
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        isActive={editor.isActive("orderedList")}
                        title="Numbered list"
                    >
                        <ListOrdered className="h-3.5 w-3.5" />
                    </BubbleButton>
                </div>
            )}

            <EditorContent
                editor={editor}
                style={{ minHeight }}
            />

            <style jsx global>{`
                .is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: hsl(var(--muted-foreground) / 0.5);
                    pointer-events: none;
                    height: 0;
                    font-size: var(--rte-placeholder-size, 0.875rem);
                    line-height: 1.35;
                }
            `}</style>
        </div>
    );
}
