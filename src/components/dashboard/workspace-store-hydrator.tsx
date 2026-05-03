"use client";

import { useRef } from "react";
import { useWorkspaceStore } from "@/stores/workspace-store";

export function WorkspaceStoreHydrator({ workspaceName }: { workspaceName: string }) {
  const hydratedRef = useRef(false);

  if (!hydratedRef.current) {
    useWorkspaceStore.getState().setWorkspaceName(workspaceName);
    hydratedRef.current = true;
  }

  return null;
}
