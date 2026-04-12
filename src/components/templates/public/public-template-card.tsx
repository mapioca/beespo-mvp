import Link from "next/link";
import { Clock, FileText } from "lucide-react";

import type { PublicTemplate } from "./types";

interface PublicTemplateCardProps {
  template: PublicTemplate;
  detailHref: string;
  useHref: string;
}

const KIND_LABELS: Record<Exclude<PublicTemplate["templateKind"], null>, string> = {
  agenda: "Agenda",
  program: "Program",
  form: "Form",
  event: "Event",
  table: "Table",
};

export function PublicTemplateCard({ template, detailHref, useHref }: PublicTemplateCardProps) {
  return (
    <article className="flex h-full flex-col rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="inline-flex rounded-full bg-muted px-2.5 py-1 font-medium capitalize">
          {template.templateKind ? KIND_LABELS[template.templateKind] : "Template"}
        </span>
        <span>{template.itemCount} items</span>
      </div>

      <h2 className="text-lg font-semibold leading-tight">
        <Link href={detailHref} className="hover:underline">
          {template.name}
        </Link>
      </h2>

      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
        {template.description || "Reusable template to kickstart planning in seconds."}
      </p>

      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
        <p className="inline-flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {template.estimatedDurationMinutes > 0
            ? `${template.estimatedDurationMinutes} min estimated`
            : "Flexible duration"}
        </p>
        <p className="inline-flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {template.itemCount} template item{template.itemCount === 1 ? "" : "s"}
        </p>
      </div>

      {template.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {template.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center gap-2">
        <Link
          href={detailHref}
          className="inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium hover:bg-accent"
        >
          Preview
        </Link>
        <Link
          href={useHref}
          className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Use this template
        </Link>
      </div>
    </article>
  );
}
