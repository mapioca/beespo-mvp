"use client";

import React from "react";
import { GripVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DragHandleProps } from "@/types/dashboard";
import { WidgetErrorFallback } from "./widget-error-fallback";

interface WidgetCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  dragHandleProps?: DragHandleProps;
  isDragging?: boolean;
  className?: string;
}

class WidgetErrorBoundary extends React.Component<
  { children: React.ReactNode; widgetName: string },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; widgetName: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(`Widget "${this.props.widgetName}" crashed:`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <WidgetErrorFallback
          onRetry={() => this.setState({ hasError: false })}
        />
      );
    }
    return this.props.children;
  }
}

export function WidgetCard({
  title,
  icon,
  children,
  dragHandleProps,
  isDragging,
  className,
}: WidgetCardProps) {
  return (
    <Card
      className={cn(
        "bg-white shadow-sm border-0 ring-1 ring-gray-200 transition-shadow",
        isDragging && "shadow-lg ring-2 ring-primary/40",
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {dragHandleProps && (
            <div
              {...dragHandleProps.attributes}
              {...dragHandleProps.listeners}
              className="cursor-grab active:cursor-grabbing touch-none shrink-0 -ml-1"
              aria-label="Drag to reorder"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/50" />
            </div>
          )}
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <WidgetErrorBoundary widgetName={title}>{children}</WidgetErrorBoundary>
      </CardContent>
    </Card>
  );
}
