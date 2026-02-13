"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/lib/hooks/use-toast";
import {
  createGlobalTemplateAction,
  updateGlobalTemplateAction,
} from "@/app/(admin)/admin/templates/actions";
import type { TemplateItem } from "@/components/templates/types";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  GripVertical,
  Music,
  BookOpen,
  MessageSquare,
  Briefcase,
  Megaphone,
  User,
  Search,
  Clock,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// --- Types ---

interface ProceduralItemType {
  id: string;
  name: string;
  description: string | null;
  default_duration_minutes: number | null;
  is_hymn: boolean | null;
  category: string | null;
}

// --- Sortable Item ---

function SortableItem({
  item,
  isLoading,
  onRemove,
  onUpdate,
}: {
  item: TemplateItem;
  isLoading: boolean;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof TemplateItem, value: string | number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getIcon = () => {
    if (item.is_hymn_type) return <Music className="h-4 w-4 text-blue-400" />;
    switch (item.item_type) {
      case "procedural": return <BookOpen className="h-4 w-4 text-zinc-400" />;
      case "discussion": return <MessageSquare className="h-4 w-4 text-green-400" />;
      case "business": return <Briefcase className="h-4 w-4 text-purple-400" />;
      case "announcement": return <Megaphone className="h-4 w-4 text-orange-400" />;
      case "speaker": return <User className="h-4 w-4 text-pink-400" />;
      default: return <BookOpen className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getTypeBadge = () => {
    const colors: Record<string, string> = {
      procedural: "border-zinc-600 text-zinc-400",
      discussion: "border-green-700 text-green-400",
      business: "border-purple-700 text-purple-400",
      announcement: "border-orange-700 text-orange-400",
      speaker: "border-pink-700 text-pink-400",
    };
    const labels: Record<string, string> = {
      procedural: "Procedural",
      discussion: "Discussion",
      business: "Business",
      announcement: "Announcement",
      speaker: "Speaker",
    };
    return (
      <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase tracking-wider", colors[item.item_type] || colors.procedural)}>
        {item.is_hymn_type ? "Hymn" : labels[item.item_type] || item.item_type}
      </span>
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3 group transition-all",
        isDragging && "opacity-50 shadow-lg ring-1 ring-zinc-600 z-50"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex items-center pt-1.5 cursor-grab active:cursor-grabbing touch-none text-zinc-600 hover:text-zinc-400"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          {getIcon()}
          {getTypeBadge()}
        </div>
        <Input
          value={item.title}
          onChange={(e) => onUpdate(item.id, "title", e.target.value)}
          placeholder="Item title"
          disabled={isLoading}
          className="h-8 border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500 text-sm font-medium"
        />
        <Input
          value={item.description || ""}
          onChange={(e) => onUpdate(item.id, "description", e.target.value)}
          placeholder="Description (optional)"
          disabled={isLoading}
          className="h-7 border-zinc-700/50 bg-zinc-800/50 text-zinc-300 placeholder:text-zinc-600 text-xs"
        />
      </div>

      <div className="flex items-start gap-2 pt-6 shrink-0">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-zinc-500" />
          <Input
            type="number"
            min="1"
            value={item.duration_minutes}
            onChange={(e) => onUpdate(item.id, "duration_minutes", parseInt(e.target.value) || 1)}
            disabled={isLoading}
            className="w-14 h-8 border-zinc-700 bg-zinc-800 text-zinc-100 text-sm text-center"
          />
          <span className="text-[10px] text-zinc-500">min</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(item.id)}
          disabled={isLoading}
          className="h-8 w-8 text-zinc-600 hover:text-red-400 hover:bg-zinc-800"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// --- Inline Item Picker ---

function InlineItemPicker({
  onAdd,
  onClose,
  existingItemTypes,
}: {
  onAdd: (item: TemplateItem) => void;
  onClose: () => void;
  existingItemTypes: string[];
}) {
  const [search, setSearch] = useState("");
  const [proceduralTypes, setProceduralTypes] = useState<ProceduralItemType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTypes = async () => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from("procedural_item_types") as any)
        .select("id, name, description, default_duration_minutes, is_hymn, category")
        .order("order_hint");
      if (data) setProceduralTypes(data);
      setIsLoading(false);
    };
    fetchTypes();
  }, []);

  const handleSelectProcedural = (type: ProceduralItemType) => {
    onAdd({
      id: crypto.randomUUID(),
      title: type.name,
      description: null,
      duration_minutes: type.default_duration_minutes || 5,
      item_type: "procedural",
      procedural_item_type_id: type.id,
      hymn_id: null,
      is_hymn_type: type.is_hymn || false,
      isNew: true,
    });
  };

  const handleSelectSpecial = (
    itemType: "discussion" | "business" | "announcement" | "speaker",
    title: string,
    duration: number
  ) => {
    onAdd({
      id: crypto.randomUUID(),
      title,
      description: null,
      duration_minutes: duration,
      item_type: itemType,
      hymn_id: null,
      isNew: true,
    });
  };

  const searchLower = search.toLowerCase();

  const specialItems = [
    { type: "discussion" as const, title: "Discussion & Counsel", duration: 15, icon: MessageSquare, color: "text-green-400", desc: "Link to Discussion topics", singleton: true },
    { type: "announcement" as const, title: "Announcements", duration: 5, icon: Megaphone, color: "text-orange-400", desc: "Link to active Announcements", singleton: true },
    { type: "business" as const, title: "Ward Business", duration: 5, icon: Briefcase, color: "text-purple-400", desc: "Callings, Releases, Ordinations", singleton: true },
    { type: "speaker" as const, title: "Speaker", duration: 10, icon: User, color: "text-pink-400", desc: "Assign speakers and topics", singleton: false },
  ];

  const filteredProcedural = proceduralTypes.filter((t) =>
    t.name.toLowerCase().includes(searchLower)
  );

  const filteredSpecial = specialItems.filter((s) =>
    s.title.toLowerCase().includes(searchLower)
  );

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <span className="text-sm font-medium text-zinc-200">Add Agenda Item</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7 text-zinc-400 hover:text-zinc-200"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500 text-sm"
            autoFocus
          />
        </div>
      </div>

      {/* Item List */}
      <div className="max-h-72 overflow-y-auto divide-y divide-zinc-800/50">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-zinc-500">Loading items...</div>
        ) : (
          <>
            {/* Special Items */}
            {filteredSpecial.length > 0 && (
              <>
                <div className="px-4 py-1.5 bg-zinc-800/30">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Specialized</span>
                </div>
                {filteredSpecial.map((s) => {
                  const disabled = s.singleton && existingItemTypes.includes(s.type);
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.type}
                      onClick={() => !disabled && handleSelectSpecial(s.type, s.title, s.duration)}
                      disabled={disabled}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                        disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-zinc-800"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", s.color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-200">{s.title}</p>
                        <p className="text-xs text-zinc-500">{s.desc}</p>
                      </div>
                      {disabled && <span className="text-[10px] text-zinc-600 border border-zinc-700 px-1.5 py-0.5 rounded">Added</span>}
                    </button>
                  );
                })}
              </>
            )}

            {/* Procedural Items */}
            {filteredProcedural.length > 0 && (
              <>
                <div className="px-4 py-1.5 bg-zinc-800/30">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Procedural & Worship</span>
                </div>
                {filteredProcedural.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleSelectProcedural(type)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-800 transition-colors"
                  >
                    {type.is_hymn ? (
                      <Music className="h-4 w-4 text-blue-400 shrink-0" />
                    ) : (
                      <BookOpen className="h-4 w-4 text-zinc-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200">{type.name}</p>
                      {type.description && <p className="text-xs text-zinc-500 truncate">{type.description}</p>}
                    </div>
                    <span className="text-xs text-zinc-500 shrink-0">{type.default_duration_minutes || 5}m</span>
                  </button>
                ))}
              </>
            )}

            {filteredProcedural.length === 0 && filteredSpecial.length === 0 && (
              <div className="p-4 text-center text-sm text-zinc-500">No items found</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// --- Main Component ---

interface AdminTemplateBuilderProps {
  mode?: "create" | "edit";
  templateId?: string;
  initialName?: string;
  initialDescription?: string;
  initialTags?: string[];
  initialItems?: TemplateItem[];
}

export function AdminTemplateBuilder({
  mode = "create",
  templateId,
  initialName = "",
  initialDescription = "",
  initialTags = [],
  initialItems = [],
}: AdminTemplateBuilderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [tagsInput, setTagsInput] = useState(initialTags.join(", "));
  const [items, setItems] = useState<TemplateItem[]>(initialItems);
  const [isSaving, setIsSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const isEdit = mode === "edit";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleAddItem = useCallback((item: TemplateItem) => {
    setItems((prev) => [...prev, item]);
    setShowPicker(false);
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleUpdateItem = useCallback((id: string, field: keyof TemplateItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((item) => item.id === active.id);
      const newIndex = prev.findIndex((item) => item.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  const totalDuration = items.reduce((acc, item) => acc + (item.duration_minutes || 0), 0);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Error", description: "Template name is required.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        tags,
        items,
      };

      const result = isEdit && templateId
        ? await updateGlobalTemplateAction(templateId, payload)
        : await createGlobalTemplateAction(payload);

      if (result.success) {
        toast({
          title: isEdit ? "Template Updated" : "Template Created",
          description: isEdit
            ? `"${name}" has been updated.`
            : `"${name}" is now available to all workspaces.`,
        });
        router.push("/templates");
      } else {
        toast({ title: "Error", description: result.error || `Failed to ${isEdit ? "update" : "create"} template.`, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/templates">
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-200">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-zinc-100">
            {isEdit ? "Edit Template" : "New Global Template"}
          </h1>
          <p className="text-zinc-400">
            {isEdit ? "Update this global template" : "This template will be available to all workspaces"}
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving || !name.trim()}
          className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : isEdit ? "Save Changes" : "Save Template"}
        </Button>
      </div>

      {/* Form */}
      <div className="max-w-3xl space-y-6">
        <div className="space-y-2">
          <Label htmlFor="template-name" className="text-zinc-300">Template Name</Label>
          <Input
            id="template-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Sacrament Meeting"
            disabled={isSaving}
            className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="template-description" className="text-zinc-300">Description</Label>
          <Textarea
            id="template-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this template..."
            disabled={isSaving}
            rows={3}
            className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500 resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="template-tags" className="text-zinc-300">Tags (comma-separated)</Label>
          <Input
            id="template-tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g., sacrament, sunday, worship"
            disabled={isSaving}
            className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500"
          />
        </div>

        {/* Agenda Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-zinc-300">Agenda Items</Label>
              {items.length > 0 && (
                <p className="text-xs text-zinc-500 mt-0.5">
                  {items.length} item{items.length !== 1 ? "s" : ""} &middot; {totalDuration} min total
                </p>
              )}
            </div>
            {!showPicker && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPicker(true)}
                disabled={isSaving}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Item
              </Button>
            )}
          </div>

          {/* Inline picker */}
          {showPicker && (
            <InlineItemPicker
              onAdd={handleAddItem}
              onClose={() => setShowPicker(false)}
              existingItemTypes={items.map((i) => i.item_type)}
            />
          )}

          {/* Items list */}
          {items.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-zinc-800 rounded-lg">
              <p className="text-sm text-zinc-500">
                No items yet. Click &ldquo;Add Item&rdquo; to build your template agenda.
              </p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {items.map((item) => (
                    <SortableItem
                      key={item.id}
                      item={item}
                      isLoading={isSaving}
                      onRemove={handleRemoveItem}
                      onUpdate={handleUpdateItem}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}
