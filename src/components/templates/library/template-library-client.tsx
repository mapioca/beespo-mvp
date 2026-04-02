"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Library, Plus, ArrowUpRight, FormInput } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TemplateLibraryCard } from "./template-library-card";
import { TemplatePreviewDialog } from "./template-preview-dialog";
import { cloneTemplateAction } from "@/app/(dashboard)/templates/library/actions";
import { toast } from "@/lib/toast";
import { LibraryTemplate } from "./types";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SOURCES = [
  { value: "mine", label: "My Templates" },
  { value: "beespo", label: "Beespo Official" },
  { value: "community", label: "Community" },
  { value: "all", label: "All Sources" },
];

const COMMUNITY_LIBRARY_URL = "https://www.beespo.com/templates";

interface TemplateLibraryClientProps {
  templates: LibraryTemplate[];
  workspaceId: string | null;
  currentUserId: string;
}

export function TemplateLibraryClient({ templates, workspaceId, currentUserId }: TemplateLibraryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [source, setSource] = useState(() => searchParams.get("tab") ?? "mine");

  // Sync source tab when URL param changes (e.g. after clone redirect)
  useEffect(() => {
    if (searchParams.get("tab") === "mine") setSource("mine");
  }, [searchParams]);
  const [localTemplates, setLocalTemplates] = useState<LibraryTemplate[]>(templates);
  const [previewTemplate, setPreviewTemplate] = useState<LibraryTemplate | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [renameTemplate, setRenameTemplate] = useState<LibraryTemplate | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [cloneTemplate, setCloneTemplate] = useState<LibraryTemplate | null>(null);
  const [cloneName, setCloneName] = useState("");
  const [cloneDescription, setCloneDescription] = useState("");
  const [deleteTemplate, setDeleteTemplate] = useState<LibraryTemplate | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isCreatingClone, setIsCreatingClone] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setLocalTemplates(templates);
  }, [templates]);

  const filtered = useMemo(() => {
    return localTemplates.filter((t) => {
      const q = search.toLowerCase();
      const authorLabel = t.workspace_id === null ? "beespo team" : (t.author?.full_name ?? "").toLowerCase();
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        (t.description?.toLowerCase() ?? "").includes(q) ||
        authorLabel.includes(q);

      const isBeespo = t.workspace_id === null;
      const isMine = workspaceId ? t.workspace_id === workspaceId : false;
      const isCommunity = !isBeespo && !isMine;

      const matchesSource =
        source === "all"
          ? isBeespo || isCommunity || isMine
          : source === "beespo"
          ? isBeespo
          : source === "community"
          ? isCommunity
          : source === "mine"
          ? isMine
          : true;

      return matchesSearch && matchesSource;
    });
  }, [localTemplates, search, source, workspaceId]);

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

  const handleOpenClone = (template: LibraryTemplate) => {
    setCloneTemplate(template);
    setCloneName(`${template.name} Copy`);
    setCloneDescription(template.description ?? "");
  };

  const handleSubmitClone = async () => {
    if (!cloneTemplate || !cloneName.trim()) return;

    setIsCreatingClone(true);
    try {
      const result = await cloneTemplateAction(cloneTemplate.id, {
        name: cloneName.trim(),
        description: cloneDescription,
      });

      if (result.success && result.id) {
        toast.success("Template cloned", {
          description: "The cloned template has been added to your workspace.",
        });
        setCloneTemplate(null);
        setCloneName("");
        setCloneDescription("");
        setSource("mine");
        router.push("/templates/library?tab=mine");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to clone template. Please try again.");
      }
    } finally {
      setIsCreatingClone(false);
    }
  };

  const handleOpenRename = (template: LibraryTemplate) => {
    setRenameTemplate(template);
    setRenameValue(template.name);
  };

  const handleSubmitRename = async () => {
    if (!renameTemplate) return;
    const nextName = renameValue.trim();
    if (!nextName || nextName === renameTemplate.name) {
      setRenameTemplate(null);
      setRenameValue("");
      return;
    }

    setIsRenaming(true);
    const { error } = await (supabase.from("templates") as ReturnType<typeof supabase.from>)
      .update({ name: nextName })
      .eq("id", renameTemplate.id);

    if (error) {
      toast.error("Failed to rename template");
      setIsRenaming(false);
      return;
    }

    setLocalTemplates((current) =>
      current.map((template) =>
        template.id === renameTemplate.id ? { ...template, name: nextName } : template
      )
    );
    setIsRenaming(false);
    setRenameTemplate(null);
    setRenameValue("");
    toast.success("Template renamed");
  };

  const handleOpenDelete = (template: LibraryTemplate) => {
    setDeleteTemplate(template);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTemplate) return;
    setIsDeleting(true);

    const { error } = await (supabase.from("templates") as ReturnType<typeof supabase.from>)
      .delete()
      .eq("id", deleteTemplate.id);

    if (error) {
      toast.error("Failed to delete template");
      setIsDeleting(false);
      return;
    }

    setLocalTemplates((current) => current.filter((template) => template.id !== deleteTemplate.id));
    setIsDeleting(false);
    setDeleteTemplate(null);
    toast.success("Template deleted");
  };

  const handleEditTemplate = (template: LibraryTemplate) => {
    router.push(`/meetings/new?templateId=${template.id}`);
  };

  const canUseTemplateDirectly = (template: LibraryTemplate) => {
    const isWorkspaceOwned = workspaceId ? template.workspace_id === workspaceId : false;
    const isCreatorOwnedOfficial = template.workspace_id === null && template.created_by === currentUserId;
    return isWorkspaceOwned || isCreatorOwnedOfficial;
  };

  const isMyTemplatesView = source === "mine";
  const isCommunityView = source === "community";

  return (
    <div className="flex h-full flex-col bg-white">
      <Breadcrumbs className="rounded-none border-b border-border/60 bg-white px-4 py-1.5 ring-0" />
      <div className="sticky top-0 z-10 bg-white/96 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-5 py-5 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-border/60 bg-control px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Template library
                </span>
                <span className="inline-flex items-center rounded-full border border-border/60 bg-white px-2.5 py-1 text-[12px] font-medium text-foreground/72">
                  {filtered.length} template{filtered.length !== 1 ? "s" : ""}
                </span>
              </div>
              <h1 className="text-[30px] font-semibold tracking-[-0.04em] text-foreground sm:text-[36px]">
                Templates that feel curated, not crowded.
              </h1>
              <p className="mt-3 max-w-xl text-[15px] leading-7 text-muted-foreground">
                {isMyTemplatesView
                  ? "Your workspace templates."
                  : "Browse and import meeting templates for your organization."}
              </p>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {SOURCES.map((s) => (
                <Button
                  key={s.value}
                  variant="ghost"
                  size="sm"
                  onClick={() => setSource(s.value)}
                  className={
                    source === s.value
                      ? "h-8 rounded-full bg-button-primary px-3.5 text-[12px] font-medium text-button-primary hover:bg-button-primary-hover hover:text-button-primary"
                      : "h-8 rounded-full border border-border/60 bg-white px-3.5 text-[12px] font-medium text-foreground/68 hover:bg-control hover:text-foreground"
                  }
                >
                  {s.label}
                </Button>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:min-w-[520px] xl:max-w-[640px] xl:justify-end">
              {isMyTemplatesView && (
                <Button
                  asChild
                  className="h-10 shrink-0 whitespace-nowrap rounded-full px-[18px] text-[13px] font-semibold shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
                >
                  <Link href="/templates/new">
                    <Plus className="mr-1.5 h-4 w-4 stroke-[1.8]" />
                    New template
                  </Link>
                </Button>
              )}

              <div className="relative min-w-[280px] flex-1 sm:min-w-[340px]">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground stroke-[1.6]" />
                <Input
                  placeholder="Search templates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 rounded-full border-border/60 bg-white pl-10 text-[14px] shadow-[0_1px_0_rgba(15,23,42,0.04)] focus-visible:ring-0 focus-visible:border-foreground/30"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-visible bg-white px-5 pb-8 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-0 w-full max-w-[1500px]">
          <ScrollArea className="min-h-0 flex-1">
            <div className="pt-4 pb-2">
              {isCommunityView ? (
                <div className="flex min-h-[420px] flex-col items-start justify-center rounded-[28px] border border-border/60 bg-control/25 px-8 py-12 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-white">
                    <Library className="h-7 w-7 text-muted-foreground stroke-[1.6]" />
                  </div>
                  <h3 className="text-[24px] font-semibold tracking-[-0.03em] text-foreground">
                    Explore the community template library
                  </h3>
                  <p className="mt-3 max-w-xl text-[14px] leading-7 text-muted-foreground">
                    Community templates are available in our public library. Open it in a new tab to browse shared templates and bring back the ones you want to use.
                  </p>
                  <a
                    href={COMMUNITY_LIBRARY_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-button-primary px-4 py-2 text-[13px] font-semibold text-button-primary hover:bg-button-primary-hover"
                  >
                    Open community library
                    <ArrowUpRight className="h-4 w-4 stroke-[1.8]" />
                  </a>
                </div>
              ) : filtered.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((template) => {
                    const isOwned = workspaceId ? template.workspace_id === workspaceId : false;
                    const shouldUseDirectly = canUseTemplateDirectly(template);
                    return (
                      <TemplateLibraryCard
                        key={template.id}
                        template={template}
                        isOwned={isOwned}
                        onPreview={setPreviewTemplate}
                        onClone={handleOpenClone}
                        onRename={isOwned ? handleOpenRename : undefined}
                        onDelete={isOwned ? handleOpenDelete : undefined}
                        onEdit={isOwned ? handleEditTemplate : undefined}
                        onUse={shouldUseDirectly
                          ? () => router.push(`/meetings/new?templateId=${template.id}`)
                          : handleClone
                        }
                        isCloning={cloningId === template.id}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-control">
                    <FormInput className="h-7 w-7 text-muted-foreground stroke-[1.6]" />
                  </div>
                  <h3 className="mb-2 text-[22px] font-semibold tracking-[-0.02em] text-foreground">No templates found</h3>
                  <p className="max-w-md text-[14px] leading-6 text-muted-foreground">
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
      </div>

      <TemplatePreviewDialog
        template={previewTemplate}
        open={previewTemplate !== null}
        onOpenChange={(open) => { if (!open) setPreviewTemplate(null); }}
        workspaceId={workspaceId}
        currentUserId={currentUserId}
      />

      <Dialog
        open={!!cloneTemplate}
        onOpenChange={(open) => {
          if (!open && !isCreatingClone) {
            setCloneTemplate(null);
            setCloneName("");
            setCloneDescription("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Clone template</DialogTitle>
            <DialogDescription>
              Create a duplicate with a new title and optional description.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="template-clone-name">Template title</Label>
              <Input
                id="template-clone-name"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="Enter template title..."
                autoFocus
                disabled={isCreatingClone}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-clone-description">Template description</Label>
              <Textarea
                id="template-clone-description"
                value={cloneDescription}
                onChange={(e) => setCloneDescription(e.target.value)}
                placeholder="Enter template description..."
                className="min-h-[96px] resize-none"
                disabled={isCreatingClone}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCloneTemplate(null);
                setCloneName("");
                setCloneDescription("");
              }}
              disabled={isCreatingClone}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitClone} disabled={isCreatingClone || !cloneName.trim()}>
              {isCreatingClone ? "Cloning..." : "Clone template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!renameTemplate}
        onOpenChange={(open) => {
          if (!open && !isRenaming) {
            setRenameTemplate(null);
            setRenameValue("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Rename template</DialogTitle>
            <DialogDescription>
              Update the title shown in your template library.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="template-rename">Template title</Label>
            <Input
              id="template-rename"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Enter template title..."
              autoFocus
              disabled={isRenaming}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRenameTemplate(null);
                setRenameValue("");
              }}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitRename} disabled={isRenaming || !renameValue.trim()}>
              {isRenaming ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTemplate}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteTemplate(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTemplate
                ? `Delete "${deleteTemplate.name}"? This cannot be undone.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
