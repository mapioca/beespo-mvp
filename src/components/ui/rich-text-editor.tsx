"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef, useCallback, useState } from "react";
import { Bold, Italic, List, ListOrdered, Strikethrough, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================================
   RichTextEditor - TipTap Wrapper Component

   Visual Style: Jira-like comment input
   - Bordered box with rounded corners
   - Minimal toolbar (Bold, Italic, Lists, Strike)
   - Auto-save with debounce
============================================ */

interface RichTextEditorProps {
    content: string;
    onSave: (content: string) => Promise<void>;
    placeholder?: string;
    disabled?: boolean;
    debounceMs?: number;
}

interface ToolbarButtonProps {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
}

function ToolbarButton({ onClick, isActive, disabled, children, title }: ToolbarButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={cn(
                "p-1.5 rounded hover:bg-muted transition-colors",
                isActive && "bg-muted text-foreground",
                disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            {children}
        </button>
    );
}

function EditorToolbar({ editor, disabled }: { editor: Editor | null; disabled?: boolean }) {
    if (!editor) return null;

    return (
        <div className="flex items-center gap-0.5 p-2 border-b border-border/50 bg-muted/30">
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive("bold")}
                disabled={disabled}
                title="Bold (Ctrl+B)"
            >
                <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive("italic")}
                disabled={disabled}
                title="Italic (Ctrl+I)"
            >
                <Italic className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                isActive={editor.isActive("strike")}
                disabled={disabled}
                title="Strikethrough"
            >
                <Strikethrough className="h-4 w-4" />
            </ToolbarButton>
            <div className="w-px h-4 bg-border mx-1" />
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive("bulletList")}
                disabled={disabled}
                title="Bullet List"
            >
                <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive("orderedList")}
                disabled={disabled}
                title="Numbered List"
            >
                <ListOrdered className="h-4 w-4" />
            </ToolbarButton>
        </div>
    );
}

type SaveStatus = "idle" | "saving" | "saved";

export function RichTextEditor({
    content,
    onSave,
    placeholder = "Add a note...",
    disabled = false,
    debounceMs = 1000,
}: RichTextEditorProps) {
    const [isFocused, setIsFocused] = useState(false);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedContentRef = useRef(content);
    const isInitialMount = useRef(true);

    // Save function with status handling
    const saveContent = useCallback(async (html: string) => {
        if (html === lastSavedContentRef.current) return;

        setSaveStatus("saving");
        try {
            await onSave(html);
            lastSavedContentRef.current = html;
            setSaveStatus("saved");
            // Reset to idle after showing "Saved" briefly
            setTimeout(() => setSaveStatus("idle"), 2000);
        } catch {
            setSaveStatus("idle");
        }
    }, [onSave]);

    // Debounced save
    const debouncedSave = useCallback((html: string) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
            saveContent(html);
        }, debounceMs);
    }, [saveContent, debounceMs]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: false, // Disable headings for notes
                codeBlock: false, // Disable code blocks
            }),
            Placeholder.configure({
                placeholder,
                emptyEditorClass: "is-editor-empty",
            }),
        ],
        content,
        editable: !disabled,
        immediatelyRender: false, // Required for SSR/Next.js to avoid hydration mismatch
        onUpdate: ({ editor }) => {
            if (!isInitialMount.current) {
                debouncedSave(editor.getHTML());
            }
        },
        onFocus: () => setIsFocused(true),
        onBlur: () => {
            setIsFocused(false);
            // Save immediately on blur
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            if (editor) {
                saveContent(editor.getHTML());
            }
        },
        editorProps: {
            attributes: {
                class: cn(
                    "prose-sm max-w-none focus:outline-none",
                    "min-h-[80px] p-3",
                    // Custom prose styling without @tailwindcss/typography
                    "[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
                    "[&_ul]:list-disc [&_ul]:ml-4 [&_ul]:my-2",
                    "[&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:my-2",
                    "[&_li]:my-1",
                    "[&_strong]:font-semibold",
                    "[&_em]:italic",
                    "[&_s]:line-through"
                ),
            },
        },
    });

    // Update editor content when prop changes externally
    useEffect(() => {
        if (editor && content !== editor.getHTML() && content !== lastSavedContentRef.current) {
            editor.commands.setContent(content);
            lastSavedContentRef.current = content;
        }
    }, [content, editor]);

    // Mark initial mount as complete
    useEffect(() => {
        isInitialMount.current = false;
    }, []);

    // Cleanup debounce timer
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    return (
        <div
            className={cn(
                "border rounded-lg overflow-hidden transition-all duration-150",
                isFocused ? "border-ring ring-2 ring-ring/20" : "border-border",
                disabled && "opacity-60 cursor-not-allowed"
            )}
        >
            {/* Toolbar - visible when focused or has content */}
            {(isFocused || (editor && !editor.isEmpty)) && (
                <EditorToolbar editor={editor} disabled={disabled} />
            )}

            {/* Editor Content */}
            <div className="relative">
                <EditorContent editor={editor} />

                {/* Placeholder styling */}
                <style jsx global>{`
                    .is-editor-empty:first-child::before {
                        content: attr(data-placeholder);
                        float: left;
                        color: hsl(var(--muted-foreground));
                        pointer-events: none;
                        height: 0;
                    }
                `}</style>
            </div>

            {/* Footer with save status */}
            <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/50 bg-muted/20 text-xs text-muted-foreground">
                <span className="opacity-60">Rich text supported</span>
                <div className="flex items-center gap-1.5">
                    {saveStatus === "saving" && (
                        <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Saving...</span>
                        </>
                    )}
                    {saveStatus === "saved" && (
                        <>
                            <Check className="h-3 w-3 text-green-600" />
                            <span className="text-green-600">Saved</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
