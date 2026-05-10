"use client"

import { useEffect, useMemo, useState } from "react"
import { RotateCcw, Save } from "lucide-react"

import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import {
  CONDUCT_SCRIPT_KEYS,
  CONDUCT_SCRIPT_VARIABLES,
  defaultConductScriptTemplate,
  renderConductScriptTemplate,
  type ConductScriptKey,
  type ConductScriptTemplateMap,
} from "@/lib/conduct-script-templates"
import type { ContentLanguage } from "@/lib/content-language"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

type PersistedTemplate = {
  script_key: ConductScriptKey
  template: string
}

type ConductScriptsClientProps = {
  workspaceId: string
  userId: string
  defaultLanguage: ContentLanguage
  initialTemplates: PersistedTemplate[]
}

const PREVIEW_VARIABLES: Record<ContentLanguage, Record<string, string>> = {
  ENG: {
    greeting: "Good morning",
    unitName: "Sample Ward",
    presiding: "Bishop Anderson",
    conductor: "Brother Rivera",
    chorister: "Sister Lee",
    accompanist: "Brother Jensen",
    sacramentHymnNumber: "183",
    sacramentHymnTitle: "In Remembrance of Thy Suffering",
    personName: "Brother Martin",
    personNames: "Brother Martin and Sister Santos",
    memberNames: "Brother Martin\nSister Santos",
    calling: "Primary Teacher",
    callingPhrases: "Brother Martin as Primary Teacher",
    office: "Priest",
    ordinationPhrases: "Brother Martin to the office of Priest",
    baptismDate: "May 3, 2026",
    confirmationDate: "May 3, 2026",
    childName: "Emma Martin",
    voiceName: "Brother Martin",
    subjectPronoun: "he",
    objectPronoun: "him",
    possessivePronoun: "his",
    customText: "We would like to recognize the following members today.",
  },
  SPA: {
    greeting: "Buenos días",
    unitName: "Barrio Ejemplo",
    presiding: "Obispo Anderson",
    conductor: "Hermano Rivera",
    chorister: "Hermana Lee",
    accompanist: "Hermano Jensen",
    sacramentHymnNumber: "183",
    sacramentHymnTitle: "En memoria de Su sacrificio",
    personName: "Hermano Martínez",
    personNames: "Hermano Martínez y Hermana Santos",
    memberNames: "Hermano Martínez\nHermana Santos",
    calling: "maestro de la Primaria",
    callingPhrases: "Hermano Martínez como maestro de la Primaria",
    office: "presbítero",
    ordinationPhrases: "Hermano Martínez al oficio de presbítero",
    baptismDate: "3 de mayo de 2026",
    confirmationDate: "3 de mayo de 2026",
    childName: "Emma Martínez",
    voiceName: "Hermano Martínez",
    subjectPronoun: "él",
    objectPronoun: "él",
    possessivePronoun: "su",
    customText: "Deseamos reconocer a los siguientes miembros en este día.",
  },
}

function mapTemplates(rows: PersistedTemplate[]): ConductScriptTemplateMap {
  const templates: ConductScriptTemplateMap = {}
  for (const row of rows) {
    templates[row.script_key] = row.template
  }
  return templates
}

export function ConductScriptsClient({
  workspaceId,
  userId,
  defaultLanguage,
  initialTemplates,
}: ConductScriptsClientProps) {
  const [language, setLanguage] = useState<ContentLanguage>(defaultLanguage)
  const [activeKey, setActiveKey] = useState<ConductScriptKey>("welcome")
  const [savedTemplates, setSavedTemplates] = useState<ConductScriptTemplateMap>(() => mapTemplates(initialTemplates))
  const [draft, setDraft] = useState(
    savedTemplates.welcome ?? defaultConductScriptTemplate("welcome", defaultLanguage)
  )
  const [saving, setSaving] = useState(false)

  const activeMeta = CONDUCT_SCRIPT_KEYS.find((item) => item.key === activeKey) ?? CONDUCT_SCRIPT_KEYS[0]
  const activeSavedTemplate = savedTemplates[activeKey]
  const beespoDefault = defaultConductScriptTemplate(activeKey, language)
  const hasCustomTemplate = Boolean(activeSavedTemplate)
  const dirty = draft !== (activeSavedTemplate ?? beespoDefault)

  useEffect(() => {
    setDraft(savedTemplates[activeKey] ?? defaultConductScriptTemplate(activeKey, language))
  }, [activeKey, language, savedTemplates])

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("conduct_script_templates") as any)
        .select("script_key, template")
        .eq("workspace_id", workspaceId)
        .eq("language", language)

      if (cancelled || error) return
      setSavedTemplates(mapTemplates((data ?? []) as PersistedTemplate[]))
    })()
    return () => {
      cancelled = true
    }
  }, [workspaceId, language])

  const variablesInDraft = useMemo(() => {
    const matches = draft.match(/\{\{\s*([a-zA-Z0-9_]+)\s*}}/g) ?? []
    return Array.from(new Set(matches.map((match) => match.replace(/[{}\s]/g, ""))))
  }, [draft])

  const preview = useMemo(
    () => renderConductScriptTemplate(draft, PREVIEW_VARIABLES[language]),
    [draft, language]
  )

  const insertVariable = (key: string) => {
    setDraft((value) => `${value}${value.endsWith(" ") || value.endsWith("\n") || value.length === 0 ? "" : " "}{{${key}}}`)
  }

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("conduct_script_templates") as any)
      .upsert(
        {
          workspace_id: workspaceId,
          script_key: activeKey,
          language,
          template: draft,
          created_by: userId,
          updated_by: userId,
        },
        { onConflict: "workspace_id,script_key,language" }
      )

    setSaving(false)
    if (error) {
      toast.error("Failed to save script", { description: error.message })
      return
    }

    setSavedTemplates((prev) => ({ ...prev, [activeKey]: draft }))
    toast.success("Script saved")
  }

  const handleReset = async () => {
    setSaving(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("conduct_script_templates") as any)
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("script_key", activeKey)
      .eq("language", language)

    setSaving(false)
    if (error) {
      toast.error("Failed to reset script", { description: error.message })
      return
    }

    setSavedTemplates((prev) => {
      const next = { ...prev }
      delete next[activeKey]
      return next
    })
    setDraft(beespoDefault)
    toast.success("Script reset")
  }

  return (
    <div className="flex h-full flex-col bg-surface-canvas">
      <Breadcrumbs
        items={[
          { label: "Meetings", href: "/meetings/sacrament/planner" },
          { label: "Sacrament Meeting", href: "/meetings/sacrament/planner" },
          { label: "Scripts", href: "/meetings/sacrament/scripts" },
        ]}
        className="bg-transparent ring-0 border-b border-border/60 rounded-none px-4 py-1.5"
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-10">
          <aside className="space-y-5">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Sacrament Meeting
              </div>
              <h1 className="mt-2 font-serif text-3xl leading-none text-foreground">
                Conducting scripts
              </h1>
            </div>

            <div className="inline-flex rounded-full border border-border bg-surface-raised p-1">
              {(["ENG", "SPA"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLanguage(value)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    language === value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {value === "ENG" ? "English" : "Español"}
                </button>
              ))}
            </div>

            <nav className="space-y-4">
              {(["Meeting", "Ward Business"] as const).map((group) => (
                <div key={group}>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {group}
                  </div>
                  <div className="space-y-1">
                    {CONDUCT_SCRIPT_KEYS.filter((item) => item.group === group).map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setActiveKey(item.key)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
                          activeKey === item.key
                            ? "bg-surface-raised text-foreground shadow-[var(--shadow-builder-card)]"
                            : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                        )}
                      >
                        <span>{item.label}</span>
                        {savedTemplates[item.key] ? (
                          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">
                            Custom
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          <main className="grid min-w-0 gap-5 xl:grid-cols-[1fr_360px]">
            <section className="min-w-0 rounded-xl border border-border/70 bg-surface-raised shadow-[var(--shadow-builder-card)]">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-5 py-4">
                <div>
                  <h2 className="font-serif text-2xl leading-none text-foreground">{activeMeta.label}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{activeMeta.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    disabled={saving || !hasCustomTemplate}
                    className="h-8 rounded-full px-3 text-xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSave}
                    disabled={saving || !dirty}
                    className="h-8 rounded-full px-3 text-xs"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save
                  </Button>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  className="min-h-[360px] resize-y rounded-lg border-border bg-background font-mono text-[13px] leading-6"
                />

                <div>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Variables
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CONDUCT_SCRIPT_VARIABLES.map((variable) => (
                      <button
                        key={variable.key}
                        type="button"
                        onClick={() => insertVariable(variable.key)}
                        title={variable.description}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                          variablesInDraft.includes(variable.key)
                            ? "border-brand/30 bg-brand/10 text-brand"
                            : "border-border bg-background text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {variable.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <aside className="rounded-xl border border-border/70 bg-surface-raised p-5 shadow-[var(--shadow-builder-card)]">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Preview
              </div>
              <div className="whitespace-pre-line font-serif text-[18px] leading-8 text-foreground">
                {preview}
              </div>
            </aside>
          </main>
        </div>
      </div>
    </div>
  )
}
