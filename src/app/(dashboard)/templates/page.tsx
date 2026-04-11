import { Metadata } from "next";

import { TemplateLibraryClient } from "@/components/templates/library/template-library-client";
import { LibraryTemplate } from "@/components/templates/library/types";
import { fetchLibraryTemplates } from "@/lib/templates/fetch-library-templates";

export const metadata: Metadata = {
  title: "Templates | Beespo",
  description: "Browse templates across programs, agendas, and forms.",
};

export const revalidate = 0;

export default async function TemplatesPage() {
  const { templates, workspaceId, userId } = await fetchLibraryTemplates();

  return (
    <div className="flex flex-col h-screen-dynamic overflow-hidden">
      <TemplateLibraryClient
        templates={templates as unknown as LibraryTemplate[]}
        workspaceId={workspaceId}
        currentUserId={userId}
      />
    </div>
  );
}
