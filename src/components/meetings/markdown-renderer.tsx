"use client";

import ReactMarkdown from "react-markdown";

interface MarkdownRendererProps {
    markdown: string;
}

export function MarkdownRenderer({ markdown }: MarkdownRendererProps) {
    return (
        <ReactMarkdown
            components={{
                h1: ({ children }) => (
                    <h1 className="text-xl font-bold text-foreground mb-2">{children}</h1>
                ),
                h2: ({ children }) => (
                    <h2 className="text-base font-semibold text-foreground mt-4 mb-2">{children}</h2>
                ),
                p: ({ children }) => (
                    <p className="text-sm text-muted-foreground mb-1.5 leading-relaxed">{children}</p>
                ),
                strong: ({ children }) => (
                    <strong className="text-foreground font-medium">{children}</strong>
                ),
                em: ({ children }) => (
                    <em className="text-foreground not-italic font-medium">{children}</em>
                ),
                hr: () => (
                    <hr className="my-3 border-border" />
                ),
                ul: ({ children }) => (
                    <ul className="space-y-1 mb-2">{children}</ul>
                ),
                li: ({ children }) => (
                    <li className="text-sm text-muted-foreground pl-4 relative before:content-[''] before:absolute before:left-1 before:top-2 before:h-1 before:w-1 before:rounded-full before:bg-muted-foreground/50">
                        {children}
                    </li>
                ),
            }}
        >
            {markdown}
        </ReactMarkdown>
    );
}
