"use client";

import ReactMarkdown from "react-markdown";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PreviewModalProps {
  open: boolean;
  onClose: () => void;
  markdown: string;
  isLoading: boolean;
}

export function PreviewModal({
  open,
  onClose,
  markdown,
  isLoading,
}: PreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Agenda Preview</DialogTitle>
          <DialogDescription>
            Formatted markdown preview of the current agenda
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="flex-1 max-h-[60vh] pr-4">
            <div className="py-2">
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
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
