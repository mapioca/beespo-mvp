"use client";

import { useEffect, useRef, useCallback } from "react";
import type EditorJS from "@editorjs/editorjs";
import type { OutputData } from "@editorjs/editorjs";
import { cn } from "@/lib/utils";

interface NotesEditorProps {
  holderId: string;
  data: OutputData | null;
  onChange: (data: OutputData) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export function NotesEditor({
  holderId,
  data,
  onChange,
  placeholder = "Start typing notes...",
  className,
  minHeight = "300px",
}: NotesEditorProps) {
  const editorRef = useRef<EditorJS | null>(null);
  const isInitializedRef = useRef(false);

  const defaultData: OutputData = {
    time: Date.now(),
    blocks: [],
    version: "2.31.0",
  };

  // Initialize editor
  useEffect(() => {
    if (isInitializedRef.current) return;

    const initEditor = async () => {
      try {
        const EditorJS = (await import("@editorjs/editorjs")).default;
        const Header = (await import("@editorjs/header")).default;
        const List = (await import("@editorjs/list")).default;
        const Checklist = (await import("@editorjs/checklist")).default;
        const Marker = (await import("@editorjs/marker")).default;
        const InlineCode = (await import("@editorjs/inline-code")).default;

        editorRef.current = new EditorJS({
          holder: holderId,
          tools: {
            header: Header,
            list: {
              class: List,
              inlineToolbar: true,
            },
            checklist: {
              class: Checklist,
              inlineToolbar: true,
            },
            marker: Marker,
            inlineCode: InlineCode,
          },
          data: data || defaultData,
          async onChange(api) {
            const savedData = await api.saver.save();
            onChange(savedData);
          },
          placeholder,
          minHeight: 100,
        });

        await editorRef.current.isReady;
        isInitializedRef.current = true;
      } catch (error) {
        console.error("Editor.js initialization error:", error);
      }
    };

    initEditor();

    return () => {
      if (editorRef.current && typeof editorRef.current.destroy === "function") {
        editorRef.current.destroy();
        editorRef.current = null;
        isInitializedRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holderId]);

  return (
    <div
      id={holderId}
      className={cn(
        "prose prose-sm max-w-full dark:prose-invert",
        "border rounded-lg p-4 bg-background",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className
      )}
      style={{ minHeight }}
    />
  );
}

// Hook for getting editor reference to insert content programmatically
export function useEditorRef(holderId: string) {
  const getEditor = useCallback(async (): Promise<EditorJS | null> => {
    if (typeof window === 'undefined') return null;

    // Try to get the existing editor instance
    // This is a workaround since Editor.js doesn't expose a good way to access instances
    const holder = document.getElementById(holderId);
    if (!holder) return null;

    // @ts-expect-error: Accessing internal property
    return holder.__editorjs || null;
  }, [holderId]);

  const insertBlock = useCallback(
    async (block: OutputData["blocks"][0]) => {
      const editor = await getEditor();
      if (!editor) {
        console.warn("Editor not available for insert");
        return;
      }

      try {
        await editor.blocks.insert(block.type, block.data);
        // Focus on the newly inserted block
        const count = editor.blocks.getBlocksCount();
        editor.caret.setToBlock(count - 1, "end");
      } catch (error) {
        console.error("Failed to insert block:", error);
      }
    },
    [getEditor]
  );

  return { getEditor, insertBlock };
}
