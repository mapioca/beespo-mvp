"use client";

import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownRenderer } from "./markdown-renderer";

interface PreviewModalProps {
  open: boolean;
  onClose: () => void;
  markdown: string;
  isLoading: boolean;
  meetingId?: string; // Determines if the meeting is saved and printable
}

export function PreviewModal({
  open,
  onClose,
  markdown,
  isLoading,
  meetingId,
}: PreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col p-0 overflow-hidden bg-muted">
        <div className="bg-background border-b px-6 py-4 shrink-0">
          <DialogTitle>Agenda Preview</DialogTitle>
          <DialogDescription>
            High-fidelity view of the printed document
          </DialogDescription>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="flex-1 bg-muted">
            <div className="flex justify-center p-6 md:p-12">
              <div className="bg-background shadow-2xl w-full max-w-[850px] min-h-[1056px] p-12 sm:p-16 relative">
                <MarkdownRenderer markdown={markdown} />
              </div>
            </div>
          </ScrollArea>
        )}

        <div className="bg-background border-t px-6 py-4 shrink-0 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {meetingId && (
            <Button asChild variant="default">
              <a href={`/meetings/${meetingId}/print`} target="_blank" rel="noopener noreferrer">
                Print Agenda
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
