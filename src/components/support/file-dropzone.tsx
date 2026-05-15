"use client";

import { useCallback, useId, useRef, useState } from "react";
import { Paperclip, Upload, X, FileText, Image as ImageIcon, File as FileIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  ATTACHMENT_ACCEPT_ATTRIBUTE,
  ATTACHMENT_HUMAN_HINT,
  MAX_FILE_COUNT,
  formatSize,
  validateFilesForUI,
  type ValidationFailure,
} from "@/lib/support/attachment-policy";

interface FileDropzoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
  /** Compact variant for tight popovers (e.g. SupportTrigger). */
  compact?: boolean;
  /** className applied to the outer wrapper. */
  className?: string;
}

export function FileDropzone({
  files,
  onFilesChange,
  disabled = false,
  compact = false,
  className,
}: FileDropzoneProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [rejections, setRejections] = useState<ValidationFailure[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const addFiles = useCallback(
    (incoming: FileList | File[] | null) => {
      if (!incoming || disabled) return;
      const list = Array.from(incoming);
      const { accepted, rejected } = validateFilesForUI(list, files);
      if (accepted.length > 0) onFilesChange([...files, ...accepted]);
      setRejections(rejected);
    },
    [disabled, files, onFilesChange]
  );

  const removeFile = (index: number) => {
    if (disabled) return;
    const next = files.slice();
    next.splice(index, 1);
    onFilesChange(next);
    setRejections([]);
  };

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDraggingOver(true);
    }
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    e.dataTransfer.dropEffect = "copy";
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear when leaving the dropzone itself, not its children
    if (e.currentTarget === e.target) setIsDraggingOver(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (disabled) return;
    addFiles(e.dataTransfer.files);
  };

  const canAddMore = files.length < MAX_FILE_COUNT;
  const remainingSlots = MAX_FILE_COUNT - files.length;

  return (
    <div className={cn("space-y-2", className)}>
      <div
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "group relative rounded-md border border-dashed bg-muted/30 transition-colors",
          compact ? "px-3 py-2.5" : "px-4 py-5",
          isDraggingOver && !disabled
            ? "border-primary bg-primary/5"
            : "border-input hover:border-muted-foreground/50",
          disabled && "opacity-60",
          !canAddMore && "border-muted-foreground/20"
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept={ATTACHMENT_ACCEPT_ATTRIBUTE}
          className="sr-only"
          disabled={disabled || !canAddMore}
          onChange={(e) => {
            addFiles(e.target.files);
            // Reset so re-selecting the same file fires onChange again.
            e.target.value = "";
          }}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "flex cursor-pointer items-center gap-2.5 text-left",
            (disabled || !canAddMore) && "cursor-not-allowed"
          )}
        >
          {compact ? (
            <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-background text-muted-foreground">
              <Upload className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
              {canAddMore ? (
                <>
                  <span className="text-foreground">
                    {isDraggingOver ? "Drop to attach" : "Drag files here or click"}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">
                  Attachment limit reached ({MAX_FILE_COUNT})
                </span>
              )}
            </div>
            <div className={cn("text-muted-foreground", compact ? "text-[10px]" : "text-xs")}>
              {canAddMore
                ? ATTACHMENT_HUMAN_HINT
                : "Remove a file to add another."}
            </div>
          </div>
          {!compact && canAddMore && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {remainingSlots} left
            </span>
          )}
        </label>
      </div>

      {files.length > 0 && (
        <ul className="space-y-1.5" aria-label="Attached files">
          {files.map((file, idx) => (
            <li
              key={`${file.name}-${idx}-${file.lastModified}`}
              className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5"
            >
              <FileKindIcon mime={file.type} className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium" title={file.name}>
                  {file.name}
                </div>
                <div className="text-[10px] text-muted-foreground tabular-nums">
                  {formatSize(file.size)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                disabled={disabled}
                aria-label={`Remove ${file.name}`}
                className={cn(
                  "grid h-6 w-6 place-items-center rounded text-muted-foreground transition-colors",
                  "hover:bg-muted hover:text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  disabled && "pointer-events-none"
                )}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {rejections.length > 0 && (
        <ul
          className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 px-2.5 py-1.5"
          role="alert"
        >
          {rejections.map((r, idx) => (
            <li key={idx} className="text-[11px] text-destructive">
              <span className="font-medium">{r.file.name}</span> — {r.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FileKindIcon({ mime, className }: { mime: string; className?: string }) {
  if (mime.startsWith("image/")) return <ImageIcon className={className} />;
  if (mime === "application/pdf" || mime === "text/plain") return <FileText className={className} />;
  return <FileIcon className={className} />;
}
