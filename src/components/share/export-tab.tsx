"use client";

import { useState } from "react";
import { Copy, Check, Download, FileText, Mail, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/slug-helpers";
import type { ExportFormat, ExportResult } from "@/types/share";

interface ExportTabProps {
  meetingId: string;
}

export function ExportTab({ meetingId }: ExportTabProps) {
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);
  const [copiedFormat, setCopiedFormat] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: ExportFormat, action: "copy" | "download") => {
    setIsExporting(format);
    setError(null);

    try {
      const response = await fetch("/api/share/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meeting_id: meetingId,
          format,
          include_url: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to generate export");
        return;
      }

      const result: ExportResult = await response.json();

      if (action === "copy") {
        const success = await copyToClipboard(result.content);
        if (success) {
          setCopiedFormat(format);
          setTimeout(() => setCopiedFormat(null), 2000);
        }
      } else {
        // Download the file
        const blob = new Blob([result.content], { type: result.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      setError("Failed to generate export. Please try again.");
    } finally {
      setIsExporting(null);
    }
  };

  const exportOptions = [
    {
      format: "markdown" as ExportFormat,
      icon: FileText,
      title: "Markdown",
      description: "Perfect for Slack, Discord, or WhatsApp",
      copyLabel: "Copy as Markdown",
      showDownload: true,
    },
    {
      format: "html" as ExportFormat,
      icon: Mail,
      title: "Email HTML",
      description: "Styled for Gmail, Outlook, or other email clients",
      copyLabel: "Copy as HTML",
      showDownload: true,
    },
    {
      format: "ics" as ExportFormat,
      icon: Calendar,
      title: "Calendar Event",
      description: "Import into Google Calendar, Outlook, or Apple Calendar",
      copyLabel: null,
      showDownload: true,
      downloadLabel: "Download .ics",
    },
  ];

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
        </div>
      )}

      {exportOptions.map((option) => {
        const Icon = option.icon;
        const isLoading = isExporting === option.format;
        const isCopied = copiedFormat === option.format;

        return (
          <div
            key={option.format}
            className="flex items-start justify-between p-4 bg-muted/50 rounded-lg"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-background rounded-md">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-medium">{option.title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {option.description}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {option.copyLabel && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport(option.format, "copy")}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCopied ? (
                    <>
                      <Check className="h-4 w-4 mr-1 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              )}
              {option.showDownload && (
                <Button
                  variant={option.copyLabel ? "ghost" : "outline"}
                  size="sm"
                  onClick={() => handleExport(option.format, "download")}
                  disabled={isLoading}
                >
                  {isLoading && !option.copyLabel ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-1" />
                      {option.downloadLabel || "Download"}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        );
      })}

      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-2">Export includes:</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Meeting title and date</li>
          <li>• Numbered agenda items with descriptions</li>
          <li>• Duration estimates and presenter names</li>
          <li>• Link back to the public view (if shared)</li>
        </ul>
      </div>
    </div>
  );
}
