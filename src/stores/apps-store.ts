import { create } from "zustand";
import type { App, WorkspaceAppWithApp, WorkspaceAppStatus, AppFeature } from "@/types/apps";

export interface AppsState {
  // Available apps (marketplace)
  apps: App[];
  isLoadingApps: boolean;

  // Workspace apps (connected)
  workspaceApps: WorkspaceAppWithApp[];
  isLoadingWorkspaceApps: boolean;

  // Connection state
  connectingAppSlug: string | null;
  connectionError: string | null;

  // Actions
  setApps: (apps: App[]) => void;
  setLoadingApps: (isLoading: boolean) => void;
  setWorkspaceApps: (workspaceApps: WorkspaceAppWithApp[]) => void;
  setLoadingWorkspaceApps: (isLoading: boolean) => void;
  setConnectingApp: (slug: string | null) => void;
  setConnectionError: (error: string | null) => void;

  // Workspace app mutations
  addWorkspaceApp: (workspaceApp: WorkspaceAppWithApp) => void;
  updateWorkspaceAppStatus: (appId: string, status: WorkspaceAppStatus) => void;
  removeWorkspaceApp: (appId: string) => void;

  // Computed helpers
  isAppConnected: (slug: string) => boolean;
  getWorkspaceApp: (slug: string) => WorkspaceAppWithApp | undefined;
  hasFeature: (feature: AppFeature) => boolean;

  // Reset
  reset: () => void;
}

const initialState = {
  apps: [] as App[],
  isLoadingApps: false,
  workspaceApps: [] as WorkspaceAppWithApp[],
  isLoadingWorkspaceApps: false,
  connectingAppSlug: null as string | null,
  connectionError: null as string | null,
};

export const useAppsStore = create<AppsState>()((set, get) => ({
  ...initialState,

  // Apps actions
  setApps: (apps) => set({ apps }),
  setLoadingApps: (isLoading) => set({ isLoadingApps: isLoading }),

  // Workspace apps actions
  setWorkspaceApps: (workspaceApps) => set({ workspaceApps }),
  setLoadingWorkspaceApps: (isLoading) => set({ isLoadingWorkspaceApps: isLoading }),

  // Connection actions
  setConnectingApp: (slug) => set({ connectingAppSlug: slug, connectionError: null }),
  setConnectionError: (error) => set({ connectionError: error, connectingAppSlug: null }),

  // Workspace app mutations
  addWorkspaceApp: (workspaceApp) =>
    set((state) => ({
      workspaceApps: [...state.workspaceApps, workspaceApp],
    })),

  updateWorkspaceAppStatus: (appId, status) =>
    set((state) => ({
      workspaceApps: state.workspaceApps.map((wa) =>
        wa.app_id === appId
          ? { ...wa, status, connected_at: status === "connected" ? new Date().toISOString() : wa.connected_at }
          : wa
      ),
    })),

  removeWorkspaceApp: (appId) =>
    set((state) => ({
      workspaceApps: state.workspaceApps.filter((wa) => wa.app_id !== appId),
    })),

  // Computed helpers
  isAppConnected: (slug) => {
    const { workspaceApps } = get();
    return workspaceApps.some((wa) => wa.app.slug === slug && wa.status === "connected");
  },

  getWorkspaceApp: (slug) => {
    const { workspaceApps } = get();
    return workspaceApps.find((wa) => wa.app.slug === slug);
  },

  hasFeature: (feature) => {
    const { workspaceApps } = get();
    return workspaceApps.some(
      (wa) => wa.status === "connected" && wa.app.features.includes(feature)
    );
  },

  // Reset
  reset: () => set(initialState),
}));

// Selector hooks
export const useApps = () => useAppsStore((state) => state.apps);

export const useWorkspaceApps = () => useAppsStore((state) => state.workspaceApps);

export const useConnectedApps = () =>
  useAppsStore((state) => state.workspaceApps.filter((wa) => wa.status === "connected"));

export const useIsCanvaConnected = () =>
  useAppsStore((state) =>
    state.workspaceApps.some((wa) => wa.app.slug === "canva" && wa.status === "connected")
  );

export const useHasFeature = (feature: AppFeature) =>
  useAppsStore((state) =>
    state.workspaceApps.some(
      (wa) => wa.status === "connected" && wa.app.features.includes(feature)
    )
  );

export const useIsConnecting = (slug?: string) =>
  useAppsStore((state) =>
    slug ? state.connectingAppSlug === slug : state.connectingAppSlug !== null
  );
