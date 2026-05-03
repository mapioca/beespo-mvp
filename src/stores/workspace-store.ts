import { create } from "zustand";

interface WorkspaceStoreState {
  workspaceName: string;
  setWorkspaceName: (name: string) => void;
}

export const useWorkspaceStore = create<WorkspaceStoreState>()((set) => ({
  workspaceName: "",
  setWorkspaceName: (name) => set({ workspaceName: name }),
}));
