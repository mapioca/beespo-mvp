"use client";

import { useState } from "react";
import { TERMS_UPDATE_NOTICE } from "@/lib/terms/terms-update-notice";
import { acknowledgeTermsVersion } from "@/lib/actions/legal-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface TermsUpdateBannerProps {
  currentAcknowledgedVersion: string | null;
}

export function TermsUpdateBanner({ currentAcknowledgedVersion }: TermsUpdateBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!TERMS_UPDATE_NOTICE.active) return null;
  if (currentAcknowledgedVersion === TERMS_UPDATE_NOTICE.version) return null;

  const cutoffDate = new Date(TERMS_UPDATE_NOTICE.effectiveDate);
  cutoffDate.setDate(cutoffDate.getDate() + 30);
  if (new Date() > cutoffDate) return null;

  if (dismissed) return null;

  const effectiveDateFormatted = new Date(TERMS_UPDATE_NOTICE.effectiveDate).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  async function handleDismiss() {
    const result = await acknowledgeTermsVersion(TERMS_UPDATE_NOTICE.version);
    if (result.success) {
      setDismissed(true);
    }
  }

  return (
    <Alert className="rounded-none border-x-0 border-t-0 border-b">
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>
          {TERMS_UPDATE_NOTICE.summary}{" "}
          <a
            href={TERMS_UPDATE_NOTICE.termsUrl}
            className="underline underline-offset-2 hover:no-underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Review terms
          </a>{" "}
          <span className="text-muted-foreground">(effective {effectiveDateFormatted})</span>
        </span>
        <Button variant="outline" size="sm" onClick={handleDismiss} className="shrink-0">
          I understand
        </Button>
      </AlertDescription>
    </Alert>
  );
}
