"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GuestViewPreviewProps {
  url: string;
}

export function GuestViewPreview({ url }: GuestViewPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Guest View Preview</h4>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => window.open(url, "_blank")}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Open in new tab
        </Button>
      </div>

      <div className="relative border rounded-lg overflow-hidden bg-background">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <iframe
          src={url}
          className="w-full h-[300px] border-0"
          title="Guest View Preview"
          onLoad={() => setIsLoading(false)}
          sandbox="allow-same-origin allow-scripts"
        />
      </div>

      <p className="text-xs text-muted-foreground text-center">
        This is how guests will see the shared meeting
      </p>
    </div>
  );
}
