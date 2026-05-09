"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef, useCallback, useState } from "react";
import { Bold, Italic, Strikethrough, List, ListOrdered, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================================
   RichTextEditor — TipTap with custom floating bubble toolbar

   Design:
   - Clean bare textarea by default — no static toolbar
   - On text selection, a dark floating pill appears above the
     selection with Bold / Italic / Strike / Lists buttons
   - Keyboard shortcuts (Ctrl/Cmd+B/I) work natively via StarterKit
   - Tiny save-status dot top-right
============================================ */

interface RichTextEditorProps {
    content: string;
    onSave: (content: string) => Promise<void>;
    placeholder?: string;
    disabled?: boolean;
    debounceMs?: number;
    placeholderFontSize?: string;
    /** Drop the wrapper border/shadow when nested inside another surface. */
    bare?: boolean;
    /** Override the inner editor minimum height (default: min-h-[60px]). */
    contentMinHeightClass?: string;
}

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
                // Prevent editor from losing focus when clicking toolbar
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

type SaveStatus = "idle" | "saving" | "saved";

export function RichTextEditor({
    content,
    onSave,
    placeholder = "Add a note...",
    disabled = false,
    debounceMs = 1000,
    placeholderFontSize = "0.875rem",
    bare = false,
    contentMinHeightClass = "min-h-[60px]",
}: RichTextEditorProps) {
    const [isFocused, setIsFocused] = useState(false);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
    const [bubbleStyle, setBubbleStyle] = useState<React.CSSProperties | null>(null);
    const [, forceRerender] = useState(0); // to re-read editor active states

    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const bubbleHideTimer = useRef<NodeJS.Timeout | null>(null);
    const lastSavedContentRef = useRef(content);
    const isInitialMount = useRef(true);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const saveContent = useCallback(async (html: string) => {
        if (html === lastSavedContentRef.current) return;
        setSaveStatus("saving");
        try {
            await onSave(html);
            lastSavedContentRef.current = html;
            setSaveStatus("saved");
            setTimeout(() => setSaveStatus("idle"), 1800);
        } catch {
            setSaveStatus("idle");
        }
    }, [onSave]);

    const debouncedSave = useCallback((html: string) => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => saveContent(html), debounceMs);
    }, [saveContent, debounceMs]);

    // Compute floating bubble position based on native selection
    const updateBubble = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || selection.rangeCount === 0 || !wrapperRef.current) {
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

        // Position bubble centered above the selection, clamped to the wrapper width
        const bubbleWidth = 188; // approximate width of our pill
        let left = rect.left - wrapperRect.left + rect.width / 2 - bubbleWidth / 2;
        left = Math.max(4, Math.min(left, wrapperRect.width - bubbleWidth - 4));

        setBubbleStyle({
            position: "absolute",
            top: rect.top - wrapperRect.top - 44, // 44px above selection
            left,
            width: bubbleWidth,
            zIndex: 50,
        });

        forceRerender(n => n + 1);
    }, []);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: false,
                codeBlock: false,
            }),
            Placeholder.configure({
                placeholder,
                emptyEditorClass: "is-editor-empty",
            }),
        ],
        content,
        editable: !disabled,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            if (!isInitialMount.current) debouncedSave(editor.getHTML());
        },
        onFocus: () => setIsFocused(true),
        onBlur: () => {
            setIsFocused(false);
            // Delay hiding so toolbar clicks register first
            bubbleHideTimer.current = setTimeout(() => setBubbleStyle(null), 150);
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            if (editor) saveContent(editor.getHTML());
        },
        onSelectionUpdate: () => updateBubble(),
        editorProps: {
            attributes: {
                class: cn(
                    "prose-sm max-w-none focus:outline-none text-sm",
                    contentMinHeightClass,
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

    useEffect(() => {
        if (editor && content !== editor.getHTML() && content !== lastSavedContentRef.current) {
            editor.commands.setContent(content);
            lastSavedContentRef.current = content;
        }
    }, [content, editor]);

    useEffect(() => { isInitialMount.current = false; }, []);

    useEffect(() => () => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        if (bubbleHideTimer.current) clearTimeout(bubbleHideTimer.current);
    }, []);

    return (
        <div
            ref={wrapperRef}
            style={{ ["--rte-placeholder-size" as string]: placeholderFontSize } as React.CSSProperties}
            className={cn(
                "relative bg-background transition-all duration-150",
                bare
                    ? "border-0 shadow-none"
                    : cn(
                          "rounded-md border",
                          isFocused
                              ? "border-ring/50 shadow-[0_0_0_2px_hsl(var(--ring)/0.12)]"
                              : "border-border/60 hover:border-border"
                      ),
                disabled && "opacity-60 cursor-not-allowed"
            )}
        >
            {/* Floating bubble — appears above text selection */}
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
                        title="Bullet List"
                    >
                        <List className="h-3.5 w-3.5" />
                    </BubbleButton>
                    <BubbleButton
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        isActive={editor.isActive("orderedList")}
                        title="Numbered List"
                    >
                        <ListOrdered className="h-3.5 w-3.5" />
                    </BubbleButton>
                </div>
            )}

            {/* Save status indicator — top right corner */}
            <div className="absolute top-2 right-2.5 flex items-center gap-1 z-10 pointer-events-none">
                {saveStatus === "saving" && (
                    <Loader2 className="h-2.5 w-2.5 animate-spin text-muted-foreground/50" />
                )}
                {saveStatus === "saved" && (
                    <Check className="h-2.5 w-2.5 text-green-500/70" />
                )}
            </div>

            {/* Editor */}
            <EditorContent editor={editor} />

            {/* Placeholder styling */}
            <style jsx global>{`
            `}</style>
        </div>
    );
}
