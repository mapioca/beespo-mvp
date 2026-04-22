"use client"

import { useState, useMemo } from "react"
import { Check, Pencil, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { BusinessPersonCard } from "./business-person-card"
import {
  BUSINESS_CATEGORY_PLURAL,
  generateCombinedBusinessScript,
  type BusinessCategoryKey,
} from "@/lib/business/combined-script"
import type { BusinessItem } from "@/components/business/business-table"
import { describeOrdination } from "@/lib/business/combined-script"

interface BusinessCategorySectionProps {
  category: BusinessCategoryKey
  items: BusinessItem[]
  scriptFormat: "combined" | "individual"
  onOpenItem?: (item: BusinessItem) => void
  /** Custom override script (persisted upstream). Empty = use generated. */
  scriptOverride?: string | null
  onScriptOverrideChange?: (value: string | null) => void
}

function subtitleFor(item: BusinessItem): string | null {
  if (item.category === "ordination") {
    return describeOrdination(item)
  }
  return item.position_calling ?? null
}

export function BusinessCategorySection({
  category,
  items,
  scriptFormat,
  onOpenItem,
  scriptOverride,
  onScriptOverrideChange,
}: BusinessCategorySectionProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(scriptOverride ?? "")

  const generated = useMemo(
    () => generateCombinedBusinessScript(category, items),
    [category, items]
  )

  const activeScript = scriptOverride && scriptOverride.trim().length > 0 ? scriptOverride : generated

  if (items.length === 0) return null

  const showCombined = scriptFormat === "combined"
  const showHeaderMeta = showCombined

  const handleEditStart = () => {
    setDraft(activeScript)
    setEditing(true)
  }

  const handleSave = () => {
    const trimmed = draft.trim()
    if (trimmed === generated.trim() || trimmed.length === 0) {
      onScriptOverrideChange?.(null)
    } else {
      onScriptOverrideChange?.(trimmed)
    }
    setEditing(false)
  }

  const handleCancel = () => {
    setDraft(activeScript)
    setEditing(false)
  }

  const handleResetToGenerated = () => {
    setDraft(generated)
    onScriptOverrideChange?.(null)
  }

  return (
    <section className="space-y-3">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {BUSINESS_CATEGORY_PLURAL[category]}
          </span>
          <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-foreground px-1.5 text-[10px] font-semibold leading-none text-background">
            {items.length}
          </span>
        </div>
        {showHeaderMeta && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <span aria-hidden className="text-[13px] leading-none">+</span>
            combined script
          </span>
        )}
        {showCombined && !editing && (
          <button
            type="button"
            onClick={handleEditStart}
            className="ml-auto inline-flex items-center gap-1 text-[11.5px] font-medium text-[hsl(var(--brand))] transition-colors hover:text-[hsl(var(--brand-active))]"
          >
            <Pencil className="h-3 w-3 stroke-[1.8]" />
            Edit script
          </button>
        )}
      </div>

      {/* Tinted container wrapping combined-script + cards */}
      <div className="rounded-2xl bg-[hsl(var(--accent-warm)/0.55)] p-3.5 ring-1 ring-[hsl(var(--accent-warm))]">
        {showCombined && (
          <div className="mb-3 px-2 pt-1 pb-2">
            {editing ? (
              <div className="space-y-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={4}
                  className={cn(
                    "resize-none rounded-xl border border-border/70 bg-background text-[13px] leading-relaxed text-foreground/90 shadow-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--brand))]"
                  )}
                />
                <div className="flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={handleResetToGenerated}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Reset to generated script
                  </button>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleCancel}
                      className="h-7 gap-1 px-2.5"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSave}
                      className="h-7 gap-1 bg-[hsl(var(--brand))] px-2.5 text-[hsl(var(--brand-foreground))] hover:bg-[hsl(var(--brand-active))]"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="font-serif text-[13.5px] leading-relaxed text-foreground/85 whitespace-pre-line">
                {activeScript}
              </p>
            )}
          </div>
        )}

        <div className={cn("flex flex-col gap-2", showCombined && "pt-0")}>
          {items.map((item) => (
            <BusinessPersonCard
              key={item.id}
              name={item.person_name}
              subtitle={subtitleFor(item)}
              category={category}
              onOpen={onOpenItem ? () => onOpenItem(item) : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
