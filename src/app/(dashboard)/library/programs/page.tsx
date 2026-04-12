import { Metadata } from "next";

import { TemplateLibraryClient } from "@/components/templates/library/template-library-client";
import { LibraryTemplate } from "@/components/templates/library/types";
import { fetchLibraryTemplates } from "@/lib/templates/fetch-library-templates";

export const metadata: Metadata = {
  title: "Program Templates | Beespo",
  description: "Browse and use program templates.",
};

export default async function ProgramTemplatesPage() {
  const { templates, workspaceId, userId } = await fetchLibraryTemplates();

  return (
    <div className="flex flex-col h-screen-dynamic overflow-hidden">
      <TemplateLibraryClient
        templates={templates as unknown as LibraryTemplate[]}
        workspaceId={workspaceId}
        currentUserId={userId}
        initialKind="program"
      />
    </div>
  );
}
