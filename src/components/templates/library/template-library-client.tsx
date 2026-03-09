"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, BookOpen, Plus } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { TemplateLibraryCard } from "./template-library-card";
import { TemplatePreviewDialog } from "./template-preview-dialog";
import { cloneTemplateAction } from "@/app/(dashboard)/templates/library/actions";
import { toast } from "@/lib/toast";
import { LibraryTemplate } from "./types";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "Bishopric & Branch Presidencies", label: "Bishopric & Branch Presidencies" },
  { value: "Relief Society", label: "Relief Society" },
  { value: "Elders Quorum", label: "Elders Quorum" },
  { value: "Missionary Work", label: "Missionary Work" },
  { value: "Young Women / Young Men", label: "Young Women / Young Men" },
  { value: "Sunday School", label: "Sunday School" },
  { value: "Primary", label: "Primary" },
];

const SOURCES = [
  { value: "all", label: "All Sources" },
  { value: "beespo", label: "Beespo Official" },
  { value: "community", label: "Community" },
  { value: "mine", label: "My Templates" },
];

interface TemplateLibraryClientProps {
  templates: LibraryTemplate[];
  workspaceId: string | null;
}

export function TemplateLibraryClient({ templates, workspaceId }: TemplateLibraryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [source, setSource] = useState(() => searchParams.get("tab") === "mine" ? "mine" : "all");

  // Sync source tab when URL param changes (e.g. after clone redirect)
  useEffect(() => {
    if (searchParams.get("tab") === "mine") setSource("mine");
  }, [searchParams]);
  const [previewTemplate, setPreviewTemplate] = useState<LibraryTemplate | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      const q = search.toLowerCase();
      const authorLabel = t.workspace_id === null ? "beespo team" : (t.author?.full_name ?? "").toLowerCase();
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        (t.description?.toLowerCase() ?? "").includes(q) ||
        authorLabel.includes(q);

      const matchesCategory = category === "all" || t.calling_type === category;

      const isBeespo = t.workspace_id === null;
      const isMine = workspaceId ? t.workspace_id === workspaceId : false;
      const isCommunity = !isBeespo && !isMine;

      const matchesSource =
        source === "all"
          ? true
          : source === "beespo"
          ? isBeespo
          : source === "community"
          ? isCommunity
          : source === "mine"
          ? isMine
          : true;

      return matchesSearch && matchesCategory && matchesSource;
    });
  }, [templates, search, category, source, workspaceId]);

  const handleClone = async (template: LibraryTemplate) => {
    setCloningId(template.id);
    try {
      const result = await cloneTemplateAction(template.id);
      if (result.success && result.id) {
        toast.success("Template imported", {
          description: "The template has been added to your workspace.",
        });
        router.push("/templates/library?tab=mine");
      } else {
        toast.error(result.error ?? "Failed to import template. Please try again.");
      }
    } finally {
      setCloningId(null);
    }
  };

  const isMyTemplatesView = source === "mine";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Template Library</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isMyTemplatesView
                ? "Your workspace templates."
                : "Browse and import meeting templates for your organization."}
            </p>
          </div>
          {isMyTemplatesView && (
            <Link href="/templates/new">
              <button className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0">
                <Plus className="h-3.5 w-3.5" />
                New Template
              </button>
            </Link>
          )}
          <div className="relative w-64 shrink-0 hidden sm:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Mobile search */}
        <div className="relative sm:hidden mb-3">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Source filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {SOURCES.map((s) => (
            <Button
              key={s.value}
              variant={source === s.value ? "default" : "ghost"}
              size="sm"
              onClick={() => setSource(s.value)}
              className="h-7 text-xs"
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Category sidebar — hidden on My Templates view since own templates may not use calling_type */}
        {!isMyTemplatesView && (
          <div className="w-52 shrink-0 border-r hidden md:flex flex-col">
            <ScrollArea className="flex-1 py-3">
              <div className="px-2 space-y-0.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                      category === cat.value
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Mobile category tabs */}
        {!isMyTemplatesView && (
          <div className="md:hidden w-full border-b overflow-x-auto">
            <div className="flex items-center gap-1 px-4 py-2 min-w-max">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                    category === cat.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Template grid */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((template) => {
                  const isOwned = workspaceId ? template.workspace_id === workspaceId : false;
                  return (
                    <TemplateLibraryCard
                      key={template.id}
                      template={template}
                      isOwned={isOwned}
                      onPreview={setPreviewTemplate}
                      onUse={isOwned
                        ? () => router.push(`/meetings/new?templateId=${template.id}`)
                        : handleClone
                      }
                      isCloning={cloningId === template.id}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <BookOpen className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-1">No templates found</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {search
                    ? "No templates match your search. Try a different keyword."
                    : isMyTemplatesView
                    ? "You haven't created any templates yet. Go to Templates to create your first one."
                    : "No templates in this category yet. Check back later or explore other categories."}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <TemplatePreviewDialog
        template={previewTemplate}
        open={previewTemplate !== null}
        onOpenChange={(open) => { if (!open) setPreviewTemplate(null); }}
        workspaceId={workspaceId}
      />
    </div>
  );
}
