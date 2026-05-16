"use client";

import { useState } from "react";
import { LifeBuoy, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { uploadAttachmentsToBlob } from "@/lib/support/upload-attachments";
import { FileDropzone } from "./file-dropzone";

type RequestType = "Bug Report" | "Feature Request" | "General Question";
type Priority = "Low" | "Medium" | "High";
type SubmissionState = "idle" | "loading" | "success" | "error";
type LoadingStage = "uploading" | "submitting";

const DESCRIPTION_PLACEHOLDERS: Record<RequestType, string> = {
  "Bug Report":
    "What's happening, what you expected, and any steps to reproduce.",
  "Feature Request":
    "What would you like to see, and what problem would it solve for you?",
  "General Question":
    "Ask away — share any context that helps us point you in the right direction.",
};

interface SupportTriggerProps {
  userEmail: string;
  userName: string;
}

export function SupportTrigger({ userEmail, userName }: SupportTriggerProps) {
  const [open, setOpen] = useState(false);
  const [requestType, setRequestType] = useState<RequestType>("Bug Report");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [state, setState] = useState<SubmissionState>("idle");
  const [stage, setStage] = useState<LoadingStage | null>(null);
  const [ticketKey, setTicketKey] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const resetForm = () => {
    setRequestType("Bug Report");
    setPriority("Medium");
    setSubject("");
    setDescription("");
    setState("idle");
    setStage(null);
    setTicketKey("");
    setErrorMessage("");
    setFiles([]);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      // Reset only after the close animation so users don't see fields blank out.
      window.setTimeout(resetForm, 150);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    setErrorMessage("");

    try {
      setStage(files.length > 0 ? "uploading" : "submitting");
      const attachments = await uploadAttachmentsToBlob(files);

      setStage("submitting");
      const response = await fetch("/api/support/create-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType,
          subject,
          description,
          priority: requestType === "Bug Report" ? priority : undefined,
          userEmail,
          userName,
          metadata: {
            currentUrl: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          },
          attachments,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit request");
      }

      setTicketKey(data.ticketKey || "");
      setState("success");
    } catch (error) {
      setState("error");
      setStage(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong"
      );
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Get support"
          title="Get support"
          className={cn(
            "grid h-8 w-8 place-items-center rounded-full border border-[var(--app-nav-border)] bg-[var(--app-nav-card)] text-[var(--app-nav-icon)] transition-colors",
            "hover:bg-[var(--app-nav-hover)] hover:text-[var(--app-nav-strong)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          )}
        >
          <LifeBuoy className="h-[15px] w-[15px]" strokeWidth={1.8} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="end"
        sideOffset={12}
        className="w-[380px] p-0"
      >
        {state === "success" ? (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="rounded-full bg-green-100 p-2.5 dark:bg-green-950">
              <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-sm font-semibold">Request sent</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Thanks — we&apos;ll reply via email to {userEmail} within one business day.
              </div>
              {ticketKey ? (
                <div className="mt-2 text-xs text-muted-foreground">
                  Reference: <span className="font-mono font-medium text-foreground">{ticketKey}</span>
                </div>
              ) : null}
            </div>
            <Button size="sm" onClick={() => handleOpenChange(false)} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="border-b px-4 py-3">
              <div className="text-sm font-semibold">Get support</div>
              <div className="text-xs text-muted-foreground">
                Send us a request — we usually reply within a business day.
              </div>
            </div>

            <div className="space-y-3 px-4 py-3">
              {state === "error" && errorMessage ? (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="support-type" className="text-xs">Type</Label>
                <Select
                  value={requestType}
                  onValueChange={(value) => setRequestType(value as RequestType)}
                  disabled={state === "loading"}
                >
                  <SelectTrigger id="support-type" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bug Report">Bug report</SelectItem>
                    <SelectItem value="Feature Request">Feature request</SelectItem>
                    <SelectItem value="General Question">General question</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {requestType === "Bug Report" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="support-priority" className="text-xs">Priority</Label>
                  <Select
                    value={priority}
                    onValueChange={(value) => setPriority(value as Priority)}
                    disabled={state === "loading"}
                  >
                    <SelectTrigger id="support-priority" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="support-subject" className="text-xs">Subject</Label>
                <Input
                  id="support-subject"
                  placeholder="Brief summary"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  disabled={state === "loading"}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="support-description" className="text-xs">Description</Label>
                <Textarea
                  id="support-description"
                  placeholder={DESCRIPTION_PLACEHOLDERS[requestType]}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={5}
                  disabled={state === "loading"}
                  className="resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Attachments</Label>
                <FileDropzone
                  files={files}
                  onFilesChange={setFiles}
                  disabled={state === "loading"}
                  compact
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-4 py-2.5">
              <span className="text-[11px] text-muted-foreground">
                We&apos;ll reply to {userEmail}
              </span>
              <Button type="submit" size="sm" disabled={state === "loading"}>
                {state === "loading" ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : null}
                {state === "loading"
                  ? stage === "uploading"
                    ? "Uploading…"
                    : "Submitting…"
                  : "Send"}
              </Button>
            </div>
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
}
