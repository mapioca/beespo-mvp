"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface WidgetErrorFallbackProps {
  onRetry: () => void;
}

export function WidgetErrorFallback({ onRetry }: WidgetErrorFallbackProps) {
  const t = useTranslations("Dashboard.Widgets.error");

  return (
    <div className="py-8 text-center">
      <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
        <AlertTriangle className="h-6 w-6 text-red-500" />
      </div>
      <p className="text-sm font-medium text-gray-900 mb-1">
        {t("failed")}
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        {t("description")}
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
        {t("retry")}
      </Button>
    </div>
  );
}
