"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Clock, FileText, Tag } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import type { PublicTemplate, PublicTemplateDetailItem } from "./types";

interface PublicTemplateDetailProps {
  template: PublicTemplateDetailItem;
  relatedTemplates: PublicTemplate[];
}

export function PublicTemplateDetail({ template, relatedTemplates }: PublicTemplateDetailProps) {
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const redirectPath = useMemo(() => {
    const nextPath = searchParams?.get("redirect");
    if (!nextPath) return "/library";
    if (!nextPath.startsWith("/")) return "/library";
    if (nextPath.startsWith("//")) return "/library";
    return nextPath;
  }, [searchParams]);

  const galleryHref = useMemo(() => {
    const params = new URLSearchParams();
    const kind = searchParams?.get("kind");
    if (kind) params.set("kind", kind);
    params.set("redirect", redirectPath);
    return `/templates?${params.toString()}`;
  }, [redirectPath, searchParams]);

  const relatedHref = (slug: string) => {
    const params = new URLSearchParams();
    const kind = searchParams?.get("kind");
    if (kind) params.set("kind", kind);
    params.set("redirect", redirectPath);
    return `/templates/${slug}?${params.toString()}`;
  };

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setIsAuthenticated(Boolean(data.user));
    });
  }, []);

  const cta = useMemo(() => {
    if (isAuthenticated) {
      return {
        href: `/library/import?use=${encodeURIComponent(template.id)}&redirect=${encodeURIComponent(redirectPath)}`,
        label: "Import to workspace",
      };
    }

    return {
      href: `/login?redirect=${encodeURIComponent(redirectPath)}&use=${encodeURIComponent(template.id)}`,
      label: "Use this template → Sign up free",
    };
  }, [isAuthenticated, redirectPath, template.id]);

  return (
    <section className="container mx-auto max-w-4xl px-4 py-10 sm:py-12">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">
          <Link href={galleryHref} className="hover:underline">
            Template Gallery
          </Link>
          <span className="mx-2">/</span>
          <span className="capitalize">{template.templateKind ?? "template"}</span>
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{template.name}</h1>

        {template.description && <p className="mt-3 text-muted-foreground">{template.description}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {template.estimatedDurationMinutes > 0
              ? `${template.estimatedDurationMinutes} min estimated`
              : "Flexible duration"}
          </span>
          <span className="inline-flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {template.itemCount} item{template.itemCount === 1 ? "" : "s"}
          </span>
        </div>

        {template.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Tag className="h-3.5 w-3.5" />
              Tags:
            </span>
            {template.tags.map((tag) => (
              <span key={tag} className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Link
            href={cta.href}
            className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {cta.label}
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Template Structure</h2>

        {template.items.length > 0 ? (
          <ol className="mt-4 space-y-3">
            {template.items.map((item, index) => (
              <li key={item.id} className="rounded-xl border bg-background p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Item {index + 1}
                    </p>
                    <h3 className="mt-1 text-base font-semibold leading-tight">{item.title}</h3>
                    {item.description && (
                      <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p className="capitalize">{item.itemType}</p>
                    {item.durationMinutes ? <p>{item.durationMinutes} min</p> : <p>Flexible</p>}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No template items were found for this template.</p>
        )}
      </div>

      {relatedTemplates.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-semibold">Related Templates</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {relatedTemplates.map((related) => (
              <article key={related.id} className="rounded-xl border bg-card p-4">
                <h3 className="font-semibold leading-tight">
                  <Link href={relatedHref(related.slug)} className="hover:underline">
                    {related.name}
                  </Link>
                </h3>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {related.description || "Reusable template to speed up planning."}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
