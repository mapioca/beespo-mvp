"use client";

import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

interface MarkdownRendererProps {
    markdown: string;
    unitName?: string;
}

export function MarkdownRenderer({ markdown, unitName }: MarkdownRendererProps) {
    // Custom logic to handle the custom markdown blocks
    const renderContent = () => {
        // Find all custom blocks (grids)
        const blockRegex = /(:::roles-grid\n[\s\S]*?:::end-grid)/g;
        const blocks = markdown.split(blockRegex);

        return blocks.map((block, i) => {
            if (block.startsWith(":::roles-grid")) {
                const gridContent = block.replace(/:::roles-grid\n|:::end-grid/g, "");
                const columns = gridContent
                    .split(":::\n")
                    .filter(col => col.includes(":::roles-column"));

                return (
                    <div key={i} className="grid grid-cols-2 gap-8 mb-6 mt-4">
                        {columns.map((col, idx) => {
                            const content = col.replace(":::roles-column", "").trim();
                            if (!content) return null;

                            return (
                                <div key={idx} className="flex flex-col">
                                    <ReactMarkdown components={markdownComponents}>
                                        {content}
                                    </ReactMarkdown>
                                </div>
                            );
                        })}
                    </div>
                );
            } else if (block.trim()) {
                return (
                    <ReactMarkdown key={i} components={markdownComponents}>
                        {block}
                    </ReactMarkdown>
                );
            }
            return null;
        });
    };

    return (
        <div className="relative">
            {unitName && (
                <div className="absolute top-0 right-0 text-right">
                    <p className="text-sm font-medium text-foreground leading-none">
                        {unitName}
                    </p>
                </div>
            )}
            {renderContent()}
        </div>
    );
}

const markdownComponents: Components = {
    h1: ({ children }) => (
        <h1 className="text-xl font-bold text-foreground mb-1 leading-tight">{children}</h1>
    ),
    h3: ({ children }) => (
        <div className="mt-10 mb-3">
            <h3 className="text-[11px] font-bold text-black uppercase tracking-[0.15em] mb-2">
                {children}
            </h3>
            <hr className="border-t border-border/40" />
        </div>
    ),
    h2: ({ children }) => (
        <h2 className="text-base font-semibold text-foreground mt-4 mb-2">{children}</h2>
    ),
    p: ({ children }) => (
        <p className="text-sm text-muted-foreground mb-1.5 last:mb-0 leading-relaxed">{children}</p>
    ),
    strong: ({ children }) => (
        <strong className="text-foreground font-medium">{children}</strong>
    ),
    em: ({ children }) => (
        <em className="text-foreground not-italic font-medium">{children}</em>
    ),
    hr: () => (
        <hr className="my-3 border-t-2 border-border/60" />
    ),
    ul: ({ children }) => (
        <ul className="space-y-1 mb-2">{children}</ul>
    ),
    li: ({ children }) => (
        <li className="text-sm text-muted-foreground pl-4 relative before:content-[''] before:absolute before:left-1 before:top-2 before:h-1 before:w-1 before:rounded-full before:bg-muted-foreground/50">
            {children}
        </li>
    ),
};
