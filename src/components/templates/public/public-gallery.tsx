"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

import { PublicTemplateCard } from "./public-template-card";
import type { PublicTemplate } from "./types";

type GalleryKindFilter = "all" | "agenda" | "program" | "form";

interface PublicGalleryProps {
  templates: PublicTemplate[];
}

const KIND_FILTERS: { value: GalleryKindFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "agenda", label: "Agendas" },
  { value: "program", label: "Programs" },
  { value: "form", label: "Forms" },
];

function normalizeKindParam(value: string | null): GalleryKindFilter {
  if (!value) return "all";
  const normalized = value.toLowerCase();
  if (normalized === "agenda" || normalized === "agendas") return "agenda";
  if (normalized === "program" || normalized === "programs") return "program";
  if (normalized === "form" || normalized === "forms") return "form";
  return "all";
}

function safeRedirectPath(pathname: string | null): string {
  if (!pathname) return "/library";
  if (!pathname.startsWith("/")) return "/library";
  if (pathname.startsWith("//")) return "/library";
  return pathname;
}

export function PublicGallery({ templates }: PublicGalleryProps) {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<GalleryKindFilter>("all");
  const [tag, setTag] = useState<string>("all");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const redirectPath = safeRedirectPath(searchParams?.get("redirect") ?? null);

  useEffect(() => {
    setKind(normalizeKindParam(searchParams?.get("kind") ?? null));
  }, [searchParams]);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setIsAuthenticated(Boolean(data.user));
    });
  }, []);

  const tags = useMemo(() => {
    const allTags = new Set<string>();
    for (const template of templates) {
      for (const nextTag of template.tags) {
        allTags.add(nextTag);
      }
    }
    return Array.from(allTags).sort((a, b) => a.localeCompare(b));
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();

    return templates.filter((template) => {
      const matchesKind = kind === "all" ? true : template.templateKind === kind;
      const matchesTag = tag === "all" ? true : template.tags.includes(tag);
      const matchesSearch =
        q.length === 0
          ? true
          : template.name.toLowerCase().includes(q) ||
            (template.description ?? "").toLowerCase().includes(q) ||
            template.tags.some((templateTag) => templateTag.toLowerCase().includes(q));

      return matchesKind && matchesTag && matchesSearch;
    });
  }, [kind, search, tag, templates]);

  return (
    <div>
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Template Gallery</h1>
        <p className="mt-3 text-muted-foreground">
          Explore Beespo official templates for agendas, programs, and forms. Preview each template before importing it into your workspace.
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-6xl space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search templates by name, description, or tag..."
            className="h-10 pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {KIND_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              size="sm"
              variant={kind === filter.value ? "default" : "outline"}
              onClick={() => setKind(filter.value)}
              className="rounded-full"
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={tag === "all" ? "default" : "outline"}
              onClick={() => setTag("all")}
              className="rounded-full"
            >
              All Tags
            </Button>
            {tags.map((tagValue) => (
              <Button
                key={tagValue}
                size="sm"
                variant={tag === tagValue ? "default" : "outline"}
                onClick={() => setTag(tagValue)}
                className="rounded-full"
              >
                {tagValue}
              </Button>
            ))}
          </div>
        )}
      </div>

      {filteredTemplates.length > 0 ? (
        <div className="mx-auto mt-8 grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredTemplates.map((template) => {
              const detailParams = new URLSearchParams();
              const activeKind = kind === "all" ? null : kind;
              if (activeKind) detailParams.set("kind", activeKind);
              detailParams.set("redirect", redirectPath);
              const detailHref = `/templates/${template.slug}?${detailParams.toString()}`;
              const useHref = isAuthenticated
                ? `/library/import?use=${encodeURIComponent(template.id)}&redirect=${encodeURIComponent(redirectPath)}`
                : `/login?redirect=${encodeURIComponent(redirectPath)}&use=${encodeURIComponent(template.id)}`;
              return (
                <PublicTemplateCard
                  key={template.id}
                  template={template}
                  detailHref={detailHref}
                  useHref={useHref}
                />
              );
            })}
        </div>
      ) : (
        <div className="mx-auto mt-12 max-w-3xl rounded-2xl border bg-card p-10 text-center">
          <h2 className="text-xl font-semibold">No templates found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Try adjusting your search or filters.
          </p>
        </div>
      )}
    </div>
  );
}
