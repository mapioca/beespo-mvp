"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Sparkles, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createReleaseNoteAction,
  updateReleaseNoteAction,
} from "@/app/(admin)/admin/release-notes/actions";
import { toast } from "@/lib/toast";
import type { ReleaseNote, ReleaseNoteItem } from "@/types/release-notes";

interface ReleaseNoteEditorProps {
  note?: ReleaseNote;
}

export function ReleaseNoteEditor({ note }: ReleaseNoteEditorProps) {
  const router = useRouter();
  const isEditing = !!note;

  const [title, setTitle] = useState(note?.title || "");
  const [version, setVersion] = useState(note?.version || "");
  const [features, setFeatures] = useState<string[]>(
    note?.content.filter((i) => i.type === "feature").map((i) => i.text) || [""]
  );
  const [fixes, setFixes] = useState<string[]>(
    note?.content.filter((i) => i.type === "fix").map((i) => i.text) || [""]
  );
  const [scheduledDate, setScheduledDate] = useState(
    note?.published_at && new Date(note.published_at) > new Date()
      ? note.published_at.slice(0, 16)
      : ""
  );
  const [saving, setSaving] = useState(false);

  const buildContent = (): ReleaseNoteItem[] => {
    const items: ReleaseNoteItem[] = [];
    features.forEach((text) => {
      if (text.trim()) items.push({ type: "feature", text: text.trim() });
    });
    fixes.forEach((text) => {
      if (text.trim()) items.push({ type: "fix", text: text.trim() });
    });
    return items;
  };

  const handleSave = async (status: "draft" | "published") => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    const content = buildContent();
    if (content.length === 0) {
      toast.error("Add at least one feature or fix");
      return;
    }

    setSaving(true);

    const data = {
      title: title.trim(),
      version: version.trim() || undefined,
      content,
      status,
      published_at: status === "published" && scheduledDate
        ? new Date(scheduledDate).toISOString()
        : undefined,
    };

    const result = isEditing
      ? await updateReleaseNoteAction(note.id, data)
      : await createReleaseNoteAction(data);

    setSaving(false);

    if (result.success) {
      toast.success(
        isEditing ? "Release note updated" : "Release note created"
      );
      router.push("/release-notes");
    } else {
      toast.error(result.error || "Something went wrong");
    }
  };

  const addItem = (list: string[], setList: (v: string[]) => void) => {
    setList([...list, ""]);
  };

  const removeItem = (
    list: string[],
    setList: (v: string[]) => void,
    index: number
  ) => {
    if (list.length <= 1) return;
    setList(list.filter((_, i) => i !== index));
  };

  const updateItem = (
    list: string[],
    setList: (v: string[]) => void,
    index: number,
    value: string
  ) => {
    const updated = [...list];
    updated[index] = value;
    setList(updated);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label className="text-zinc-300">Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. February 2026 Update"
          className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
        />
      </div>

      {/* Version */}
      <div className="space-y-2">
        <Label className="text-zinc-300">
          Version <span className="text-zinc-500">(optional)</span>
        </Label>
        <Input
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="e.g. 1.2.0"
          className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 max-w-xs"
        />
      </div>

      {/* Features */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <Label className="text-zinc-300">Features</Label>
        </div>
        {features.map((text, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={text}
              onChange={(e) => updateItem(features, setFeatures, i, e.target.value)}
              placeholder="Describe the new feature..."
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-zinc-500 hover:text-zinc-300 shrink-0"
              onClick={() => removeItem(features, setFeatures, i)}
              disabled={features.length <= 1}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-zinc-200"
          onClick={() => addItem(features, setFeatures)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Feature
        </Button>
      </div>

      {/* Fixes */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-blue-400" />
          <Label className="text-zinc-300">Bug Fixes</Label>
        </div>
        {fixes.map((text, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={text}
              onChange={(e) => updateItem(fixes, setFixes, i, e.target.value)}
              placeholder="Describe the bug fix..."
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-zinc-500 hover:text-zinc-300 shrink-0"
              onClick={() => removeItem(fixes, setFixes, i)}
              disabled={fixes.length <= 1}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-zinc-200"
          onClick={() => addItem(fixes, setFixes)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Fix
        </Button>
      </div>

      {/* Schedule */}
      <div className="space-y-2">
        <Label className="text-zinc-300">
          Schedule Publication <span className="text-zinc-500">(optional, leave empty to publish immediately)</span>
        </Label>
        <Input
          type="datetime-local"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          className="bg-zinc-800 border-zinc-700 text-zinc-100 max-w-xs"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
        <Button
          variant="ghost"
          className="text-zinc-400 hover:text-zinc-200"
          onClick={() => router.push("/release-notes")}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          variant="outline"
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          onClick={() => handleSave("draft")}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save as Draft"}
        </Button>
        <Button
          className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
          onClick={() => handleSave("published")}
          disabled={saving}
        >
          {saving
            ? "Publishing..."
            : scheduledDate
              ? "Schedule"
              : "Publish Now"}
        </Button>
      </div>
    </div>
  );
}
