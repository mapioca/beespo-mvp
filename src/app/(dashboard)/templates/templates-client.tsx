"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TemplateSidebar } from "@/components/templates/template-sidebar";
import { TemplateDetailPanel } from "@/components/templates/template-detail-panel";
import { CreateMeetingSheet } from "@/components/templates/create-meeting-sheet";
import { CreateFolderDialog } from "@/components/templates/create-folder-dialog";
import { RenameFolderDialog } from "@/components/templates/rename-folder-dialog";
import { DeleteFolderDialog } from "@/components/templates/delete-folder-dialog";
import { MoveTemplateDialog } from "@/components/templates/move-template-dialog";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/hooks/use-toast";
import {
  createTemplateFolder,
  renameTemplateFolder,
  deleteTemplateFolder,
  moveTemplateToFolder,
} from "@/lib/actions/template-folder-actions";
import { Database } from "@/types/database";

type Template = Database['public']['Tables']['templates']['Row'];
type TemplateItem = Database['public']['Tables']['template_items']['Row'];
type TemplateFolder = {
  id: string;
  workspace_id: string;
  name: string;
  order_index: number;
  created_at: string;
  updated_at: string;
};

interface TemplatesClientProps {
  initialTemplates: Template[];
  initialFolders: TemplateFolder[];
  initialSelectedTemplateId: string | null;
  userRole: 'admin' | 'leader' | 'guest';
}

export function TemplatesClient({
  initialTemplates,
  initialFolders,
  initialSelectedTemplateId,
  userRole,
}: TemplatesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [templates] = useState<Template[]>(initialTemplates);
  const [folders] = useState<TemplateFolder[]>(initialFolders);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    initialSelectedTemplateId
  );
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateItems, setTemplateItems] = useState<TemplateItem[]>([]);

  // Dialog states
  const [createMeetingSheetOpen, setCreateMeetingSheetOpen] = useState(false);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [renameFolderDialogOpen, setRenameFolderDialogOpen] = useState(false);
  const [deleteFolderDialogOpen, setDeleteFolderDialogOpen] = useState(false);
  const [moveTemplateDialogOpen, setMoveTemplateDialogOpen] = useState(false);

  // Dialog context
  const [folderToRename, setFolderToRename] = useState<{ id: string; name: string } | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<{ id: string; name: string; count: number } | null>(null);

  const supabase = createClient();

  // Permissions
  const canCreateTemplate = userRole === 'admin' || userRole === 'leader';
  const canCreateMeeting = userRole === 'admin' || userRole === 'leader';
  const canEdit = Boolean(
    canCreateTemplate &&
    selectedTemplate &&
    !selectedTemplate.is_shared
  );

  // Load selected template details
  useEffect(() => {
    if (selectedTemplateId) {
      const loadTemplateDetails = async () => {
        const template = templates.find((t) => t.id === selectedTemplateId);
        if (template) {
          setSelectedTemplate(template);

          // Fetch template items
          const { data: items } = await supabase
            .from('template_items')
            .select('*')
            .eq('template_id', selectedTemplateId)
            .order('order_index');

          setTemplateItems(items || []);
        }
      };

      loadTemplateDetails();
    } else {
      setSelectedTemplate(null);
      setTemplateItems([]);
    }
  }, [selectedTemplateId, templates, supabase]);

  // Update URL when template selected
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const params = new URLSearchParams(searchParams.toString());
    params.set('selected', templateId);
    router.push(`/templates?${params.toString()}`, { scroll: false });
  };

  const handleCreateTemplate = () => {
    router.push('/templates/new');
  };

  const handleEditTemplate = () => {
    if (selectedTemplateId) {
      router.push(`/templates/${selectedTemplateId}/edit`);
    }
  };

  const handleCreateMeeting = () => {
    setCreateMeetingSheetOpen(true);
  };

  const handleMoveToFolder = () => {
    setMoveTemplateDialogOpen(true);
  };

  // Folder management handlers
  const handleCreateFolder = () => {
    setCreateFolderDialogOpen(true);
  };

  const handleCreateFolderSubmit = async (name: string) => {
    const result = await createTemplateFolder(name);
    if (result.error) {
      toast({
        title: "Error creating folder",
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({ title: "Folder created successfully" });
      router.refresh();
    }
  };

  const handleRenameFolder = (folderId: string, folderName: string) => {
    setFolderToRename({ id: folderId, name: folderName });
    setRenameFolderDialogOpen(true);
  };

  const handleRenameFolderSubmit = async (folderId: string, newName: string) => {
    const result = await renameTemplateFolder(folderId, newName);
    if (result.error) {
      toast({
        title: "Error renaming folder",
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({ title: "Folder renamed successfully" });
      router.refresh();
    }
  };

  const handleDeleteFolder = (folderId: string, folderName: string, templateCount: number) => {
    setFolderToDelete({ id: folderId, name: folderName, count: templateCount });
    setDeleteFolderDialogOpen(true);
  };

  const handleDeleteFolderSubmit = async (folderId: string) => {
    const result = await deleteTemplateFolder(folderId);
    if (result.error) {
      toast({
        title: "Error deleting folder",
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({ title: "Folder deleted successfully" });
      router.refresh();
    }
  };

  const handleMoveTemplateSubmit = async (templateId: string, folderId: string | null) => {
    const result = await moveTemplateToFolder(templateId, folderId);
    if (result.error) {
      toast({
        title: "Error moving template",
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({ title: "Template moved successfully" });
      router.refresh();
    }
  };

  // Auto-select first template if none selected
  useEffect(() => {
    if (!selectedTemplateId && templates.length > 0) {
      const firstTemplate = templates[0];
      handleSelectTemplate(firstTemplate.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="flex h-[calc(100vh-4rem)]">
        <TemplateSidebar
          templates={templates}
          folders={folders}
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={handleSelectTemplate}
          canCreateTemplate={canCreateTemplate}
          onCreateTemplate={handleCreateTemplate}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
        />

        <TemplateDetailPanel
          template={selectedTemplate}
          templateItems={templateItems}
          canEdit={canEdit}
          canCreateMeeting={canCreateMeeting}
          onCreateMeeting={handleCreateMeeting}
          onEdit={handleEditTemplate}
          onMoveToFolder={handleMoveToFolder}
        />
      </div>

      <CreateMeetingSheet
        open={createMeetingSheetOpen}
        onOpenChange={setCreateMeetingSheetOpen}
        template={selectedTemplate}
      />

      <CreateFolderDialog
        open={createFolderDialogOpen}
        onOpenChange={setCreateFolderDialogOpen}
        onCreateFolder={handleCreateFolderSubmit}
      />

      <RenameFolderDialog
        open={renameFolderDialogOpen}
        onOpenChange={setRenameFolderDialogOpen}
        folderId={folderToRename?.id || null}
        currentName={folderToRename?.name || ""}
        onRenameFolder={handleRenameFolderSubmit}
      />

      <DeleteFolderDialog
        open={deleteFolderDialogOpen}
        onOpenChange={setDeleteFolderDialogOpen}
        folderId={folderToDelete?.id || null}
        folderName={folderToDelete?.name || ""}
        templateCount={folderToDelete?.count || 0}
        onDeleteFolder={handleDeleteFolderSubmit}
      />

      <MoveTemplateDialog
        open={moveTemplateDialogOpen}
        onOpenChange={setMoveTemplateDialogOpen}
        templateId={selectedTemplateId}
        templateName={selectedTemplate?.name || ""}
        currentFolderId={selectedTemplate?.folder_id || null}
        folders={folders}
        onMoveTemplate={handleMoveTemplateSubmit}
      />
    </>
  );
}
