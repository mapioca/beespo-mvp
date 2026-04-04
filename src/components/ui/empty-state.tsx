import * as React from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, title, description, icon, action, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("mx-auto max-w-sm text-center", className)} {...props}>
        <div className="mb-4 flex justify-center text-gray-400">{icon ?? <Inbox className="h-6 w-6" />}</div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mb-6 mt-1 text-sm text-gray-500">{description}</p>
        {action ? <div className="flex justify-center">{action}</div> : null}
      </div>
    );
  }
);

EmptyState.displayName = "EmptyState";

export { EmptyState };
