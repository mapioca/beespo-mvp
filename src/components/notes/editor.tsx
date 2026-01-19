"use client";

import {useEffect, useRef} from "react";
import EditorJS, {OutputData} from "@editorjs/editorjs";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import Checklist from "@editorjs/checklist";
import Quote from "@editorjs/quote";
import Code from "@editorjs/code";
import InlineCode from "@editorjs/inline-code";
import Table from "@editorjs/table";
import Embed from "@editorjs/embed";
import LinkTool from "@editorjs/link";

interface EditorProps {
    data: OutputData;
    onChange: (data: OutputData) => void;
    holder: string;
    readOnly?: boolean;
}

export default function Editor({ data, onChange, holder, readOnly = false }: EditorProps) {
    const editorRef = useRef<EditorJS | null>(null);

    // Initialize editor
    useEffect(() => {
        if (!editorRef.current) {
            editorRef.current = new EditorJS({
                holder: holder,
                tools: {
                    header: Header,
                    list: List,
                    checklist: Checklist,
                    quote: Quote,
                    code: Code,
                    inlineCode: InlineCode,
                    table: Table,
                    embed: Embed,
                    linkTool: LinkTool,
                },
                data: data,
                async onChange(api) {
                    const savedData = await api.saver.save();
                    onChange(savedData);
                },
                readOnly: readOnly,
                placeholder: "Let's write an awesome note!",
            });
        }

        return () => {
            if (editorRef.current && typeof editorRef.current.destroy === "function") {
                editorRef.current.destroy();
                editorRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount. We handle data updates separately if needed, but usually we don't swap data prop dynamically for the same editor instance to avoid re-renders.

    // Handle data updates from parent (e.g. switching notes)
    // We need to be careful not to overwrite local changes if we are typing.
    // However, for switching notes, we usually remount this component or use a key.
    // Let's assume the parent handles remounting by changing the 'key' prop when noteId changes.
    // If we need to support external updates to the SAME note while open, we'd need more complex logic.
    // For now, based on NoteEditor logic, it fetches new data when noteId changes.

    return <div id={holder} className="prose max-w-full min-h-[500px]" />;
}
