"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  ChevronRight,
  Search,
  Plus,
  FileText,
  Folder,
  FolderPlus,
  MoreHorizontal,
  Edit2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Database } from "@/types/database";

type Template = Database['public']['Tables']['templates']['Row'];
type TemplateFolder = {
  id: string;
  workspace_id: string;
  name: string;
  order_index: number;
  created_at: string;
  updated_at: string;
};

interface TemplateSidebarProps {
  templates: Template[];
  folders: TemplateFolder[];
  selectedTemplateId: string | null;
  onSelectTemplate: (templateId: string) => void;
  canCreateTemplate: boolean;
  onCreateTemplate: () => void;
  onCreateFolder?: () => void;
  onRenameFolder?: (folderId: string, folderName: string) => void;
  onDeleteFolder?: (folderId: string, folderName: string, templateCount: number) => void;
}

// Helper to format calling type labels
function formatCallingType(callingType: string | null): string {
  if (!callingType) return "General";
  return callingType
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function TemplateSidebar({
  templates,
  folders,
  selectedTemplateId,
  onSelectTemplate,
  canCreateTemplate,
  onCreateTemplate,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: TemplateSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["beespo", "custom"])
  );

  // Filter templates by search query
  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Split templates into Beespo (shared) and Custom
  const beespoTemplates = filteredTemplates.filter((t) => t.is_shared);
  const customTemplates = filteredTemplates.filter((t) => !t.is_shared);

  // Group Beespo templates by calling_type
  const groupedBeespoTemplates = beespoTemplates.reduce((acc, template) => {
    const category = template.calling_type || "general";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  // Group custom templates by folder
  const groupedCustomTemplates = customTemplates.reduce((acc, template) => {
    const folderId = template.folder_id || "root";
    if (!acc[folderId]) {
      acc[folderId] = [];
    }
    acc[folderId].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const isCategoryExpanded = (categoryId: string) =>
    expandedCategories.has(categoryId);

  return (
    <div className="w-80 border-r bg-muted/30 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Templates</h2>
          {canCreateTemplate && (
            <Button size="sm" onClick={onCreateTemplate}>
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Template List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Beespo Templates Section */}
          <div>
            <button
              onClick={() => toggleCategory("beespo")}
              className="flex items-center justify-between w-full px-2 py-2 text-sm font-medium hover:bg-accent rounded-md transition-colors"
            >
              <div className="flex items-center gap-2">
                {isCategoryExpanded("beespo") ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span>Beespo Templates</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {beespoTemplates.length}
              </Badge>
            </button>

            {isCategoryExpanded("beespo") && (
              <div className="ml-2 mt-1 space-y-1">
                {Object.entries(groupedBeespoTemplates).map(
                  ([category, categoryTemplates]) => (
                    <div key={category}>
                      <button
                        onClick={() => toggleCategory(`beespo-${category}`)}
                        className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-medium hover:bg-accent rounded-md transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isCategoryExpanded(`beespo-${category}`) ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                          <span className="capitalize">
                            {formatCallingType(category)}
                          </span>
                        </div>
                        <span className="text-muted-foreground">
                          {categoryTemplates.length}
                        </span>
                      </button>

                      {isCategoryExpanded(`beespo-${category}`) && (
                        <div className="ml-4 mt-0.5 space-y-0.5">
                          {categoryTemplates.map((template) => (
                            <button
                              key={template.id}
                              onClick={() => onSelectTemplate(template.id)}
                              className={cn(
                                "flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md transition-colors text-left",
                                selectedTemplateId === template.id
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-accent"
                              )}
                            >
                              <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate">{template.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Custom Templates Section */}
          <div className="mt-2">
            <button
              onClick={() => toggleCategory("custom")}
              className="flex items-center justify-between w-full px-2 py-2 text-sm font-medium hover:bg-accent rounded-md transition-colors"
            >
              <div className="flex items-center gap-2">
                {isCategoryExpanded("custom") ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span>Custom Templates</span>
              </div>
              <Badge variant="default" className="text-xs">
                {customTemplates.length}
              </Badge>
            </button>

            {isCategoryExpanded("custom") && (
              <div className="ml-2 mt-1 space-y-1">
                {canCreateTemplate && onCreateFolder && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-8 text-xs"
                    onClick={onCreateFolder}
                  >
                    <FolderPlus className="h-3.5 w-3.5 mr-2" />
                    New Folder
                  </Button>
                )}

                {/* Root level custom templates (no folder) */}
                {groupedCustomTemplates.root &&
                  groupedCustomTemplates.root.length > 0 && (
                    <div className="space-y-0.5">
                      {groupedCustomTemplates.root.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => onSelectTemplate(template.id)}
                          className={cn(
                            "flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md transition-colors text-left",
                            selectedTemplateId === template.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-accent"
                          )}
                        >
                          <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{template.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                {/* Folders */}
                {folders
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((folder) => (
                    <div key={folder.id}>
                      <div className="flex items-center gap-1 group">
                        <button
                          onClick={() => toggleCategory(`folder-${folder.id}`)}
                          className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-medium hover:bg-accent rounded-md transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {isCategoryExpanded(`folder-${folder.id}`) ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                            <Folder className="h-3 w-3" />
                            <span className="truncate">{folder.name}</span>
                          </div>
                          <span className="text-muted-foreground">
                            {groupedCustomTemplates[folder.id]?.length || 0}
                          </span>
                        </button>
                        {canCreateTemplate && (onRenameFolder || onDeleteFolder) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {onRenameFolder && (
                                <DropdownMenuItem
                                  onClick={() => onRenameFolder(folder.id, folder.name)}
                                >
                                  <Edit2 className="mr-2 h-3 w-3" />
                                  Rename
                                </DropdownMenuItem>
                              )}
                              {onDeleteFolder && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    onDeleteFolder(
                                      folder.id,
                                      folder.name,
                                      groupedCustomTemplates[folder.id]?.length || 0
                                    )
                                  }
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-3 w-3" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      {isCategoryExpanded(`folder-${folder.id}`) &&
                        groupedCustomTemplates[folder.id] && (
                          <div className="ml-4 mt-0.5 space-y-0.5">
                            {groupedCustomTemplates[folder.id].map(
                              (template) => (
                                <button
                                  key={template.id}
                                  onClick={() => onSelectTemplate(template.id)}
                                  className={cn(
                                    "flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md transition-colors text-left",
                                    selectedTemplateId === template.id
                                      ? "bg-primary text-primary-foreground"
                                      : "hover:bg-accent"
                                  )}
                                >
                                  <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span className="truncate">
                                    {template.name}
                                  </span>
                                </button>
                              )
                            )}
                          </div>
                        )}
                    </div>
                  ))}

                {/* Empty state for custom templates */}
                {customTemplates.length === 0 && folders.length === 0 && (
                  <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                    No custom templates yet.
                    {canCreateTemplate && (
                      <button
                        onClick={onCreateTemplate}
                        className="block w-full mt-2 text-primary hover:underline"
                      >
                        Create your first template
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
