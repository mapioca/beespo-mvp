"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, Bug } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { dismissReleaseNoteAction } from "@/lib/actions/release-notes-actions";
import type { ReleaseNote } from "@/types/release-notes";

const SNOOZE_KEY = "beespo_release_note_snoozed_until";

interface ReleaseNoteModalProps {
  releaseNote: ReleaseNote;
  lastReadAt: string | null;
}

export function ReleaseNoteModal({ releaseNote, lastReadAt }: ReleaseNoteModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Check if user should see this note
    const publishedAt = releaseNote.published_at;
    if (!publishedAt) return;

    // Already read?
    if (lastReadAt && new Date(publishedAt) <= new Date(lastReadAt)) return;

    // Snoozed?
    const snoozedUntil = localStorage.getItem(SNOOZE_KEY);
    if (snoozedUntil && new Date() < new Date(snoozedUntil)) return;

    setOpen(true);
  }, [releaseNote.published_at, lastReadAt]);

  const handleDismiss = async () => {
    setOpen(false);
    localStorage.removeItem(SNOOZE_KEY);
    try {
      await dismissReleaseNoteAction();
    } catch {
      // Fail silently — non-critical
    }
  };

  const handleSnooze = () => {
    setOpen(false);
    const snoozeUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem(SNOOZE_KEY, snoozeUntil);
  };

  const features = releaseNote.content.filter((i) => i.type === "feature");
  const fixes = releaseNote.content.filter((i) => i.type === "fix");

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleSnooze(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            {releaseNote.title}
          </DialogTitle>
          <DialogDescription>
            {releaseNote.version && `Version ${releaseNote.version} — `}
            See what&apos;s new in Beespo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto py-2">
          {features.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                New Features
              </h4>
              <ul className="space-y-1.5">
                {features.map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground pl-5 relative before:content-[''] before:absolute before:left-1.5 before:top-2 before:h-1 before:w-1 before:rounded-full before:bg-emerald-500">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <span>{children}</span>,
                        strong: ({ children }) => <strong className="text-foreground font-medium">{children}</strong>,
                        code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>,
                      }}
                    >
                      {item.text}
                    </ReactMarkdown>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {fixes.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Bug className="h-3.5 w-3.5 text-blue-500" />
                Bug Fixes
              </h4>
              <ul className="space-y-1.5">
                {fixes.map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground pl-5 relative before:content-[''] before:absolute before:left-1.5 before:top-2 before:h-1 before:w-1 before:rounded-full before:bg-blue-500">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <span>{children}</span>,
                        strong: ({ children }) => <strong className="text-foreground font-medium">{children}</strong>,
                        code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>,
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

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={handleSnooze}>
            Remind Me Later
          </Button>
          <Button size="sm" onClick={handleDismiss}>
            Got It
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
