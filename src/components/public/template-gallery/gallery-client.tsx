"use client";

import { useState, useMemo } from "react";
import { Search, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TemplateCard } from "./template-card";
import { GalleryTemplate } from "./types";

const CATEGORIES = [
  { value: "all", label: "All Templates" },
  { value: "Bishopric & Branch Presidencies", label: "Bishopric & Branch" },
  { value: "Relief Society", label: "Relief Society" },
  { value: "Elders Quorum", label: "Elders Quorum" },
  { value: "Missionary Work", label: "Missionary Work" },
  { value: "Young Women / Young Men", label: "Young Women / Young Men" },
  { value: "Sunday School", label: "Sunday School" },
  { value: "Primary", label: "Primary" },
];

interface GalleryClientProps {
  templates: GalleryTemplate[];
  userId: string | null;
}

export function GalleryClient({ templates, userId }: GalleryClientProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return templates.filter((t) => {
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        (t.description?.toLowerCase() ?? "").includes(q) ||
        (t.calling_type?.toLowerCase() ?? "").includes(q);
      const matchesCategory =
        category === "all" || t.calling_type === category;
      return matchesSearch && matchesCategory;
    });
  }, [templates, search, category]);

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-col gap-4 mb-8">
        {/* Category pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors whitespace-nowrap",
                category === cat.value
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((template) => (
            <TemplateCard key={template.id} template={template} userId={userId} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium mb-1">No templates found</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {search
              ? "No templates match your search. Try a different keyword."
              : "No templates in this category yet. Check back later."}
          </p>
        </div>
      )}
    </div>
  );
}
