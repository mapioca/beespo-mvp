"use client";

import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import { Sparkles, Bug, Megaphone } from "lucide-react";
import type { ReleaseNote } from "@/types/release-notes";

interface ChangelogViewProps {
  notes: ReleaseNote[];
}

export function ChangelogView({ notes }: ChangelogViewProps) {
  if (notes.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-8 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Megaphone className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">What&apos;s New</h1>
          </div>
          <div className="rounded-lg border p-12 text-center">
            <p className="text-muted-foreground text-sm">
              No release notes yet. Check back soon!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Megaphone className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold tracking-tight">What&apos;s New</h1>
        </div>

        <div className="space-y-8">
          {notes.map((note) => {
            const features = note.content.filter((i) => i.type === "feature");
            const fixes = note.content.filter((i) => i.type === "fix");

            return (
              <div key={note.id} className="relative pl-6 border-l-2 border-muted">
                {/* Timeline dot */}
                <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-foreground" />

                {/* Date + Version */}
                <div className="flex items-center gap-2 mb-2">
                  <time className="text-sm text-muted-foreground">
                    {note.published_at
                      ? format(new Date(note.published_at), "MMMM d, yyyy")
                      : ""}
                  </time>
                  {note.version && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      v{note.version}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h2 className="text-lg font-semibold mb-3">{note.title}</h2>

                {/* Features */}
                {features.length > 0 && (
                  <div className="mb-3">
                    <h3 className="text-sm font-medium flex items-center gap-1.5 mb-2">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                      New Features
                    </h3>
                    <ul className="space-y-1.5">
                      {features.map((item, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground pl-5 relative before:content-[''] before:absolute before:left-1.5 before:top-2 before:h-1 before:w-1 before:rounded-full before:bg-emerald-500"
                        >
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <span>{children}</span>,
                              strong: ({ children }) => (
                                <strong className="text-foreground font-medium">{children}</strong>
                              ),
                              code: ({ children }) => (
                                <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>
                              ),
                            }}
                          >
                            {item.text}
                          </ReactMarkdown>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Fixes */}
                {fixes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium flex items-center gap-1.5 mb-2">
                      <Bug className="h-3.5 w-3.5 text-blue-500" />
                      Bug Fixes
                    </h3>
                    <ul className="space-y-1.5">
                      {fixes.map((item, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground pl-5 relative before:content-[''] before:absolute before:left-1.5 before:top-2 before:h-1 before:w-1 before:rounded-full before:bg-blue-500"
                        >
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <span>{children}</span>,
                              strong: ({ children }) => (
                                <strong className="text-foreground font-medium">{children}</strong>
                              ),
                              code: ({ children }) => (
                                <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>
                              ),
                            }}
                          >
                            {item.text}
                          </ReactMarkdown>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
