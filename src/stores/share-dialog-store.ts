import { create } from "zustand";
import type {
  ShareDialogTab,
  MeetingShareInvitation,
  MeetingShareSettings,
  ShareAnalytics,
  SharePermission,
} from "@/types/share";

export interface ShareDialogState {
  // Dialog state
  isOpen: boolean;
  meetingId: string | null;
  workspaceSlug: string | null;

  // Active tab
  activeTab: ShareDialogTab;

  // Loading states
  isLoading: boolean;
  isLoadingInvitations: boolean;
  isLoadingSettings: boolean;
  isLoadingAnalytics: boolean;
  isSendingInvitation: boolean;

  // Data
  invitations: MeetingShareInvitation[];
  settings: MeetingShareSettings | null;
  analytics: ShareAnalytics | null;

  // Form state for invite tab
  inviteEmail: string;
  invitePermission: SharePermission;

  // Preview state
  showPreview: boolean;

  // Error state
  error: string | null;

  // Actions
  openDialog: (meetingId: string, workspaceSlug: string) => void;
  closeDialog: () => void;
  setActiveTab: (tab: ShareDialogTab) => void;
  setInviteEmail: (email: string) => void;
  setInvitePermission: (permission: SharePermission) => void;
  togglePreview: () => void;
  setError: (error: string | null) => void;

  // Data fetching actions
  setLoading: (isLoading: boolean) => void;
  setInvitations: (invitations: MeetingShareInvitation[]) => void;
  addInvitation: (invitation: MeetingShareInvitation) => void;
  removeInvitation: (invitationId: string) => void;
  setSettings: (settings: MeetingShareSettings | null) => void;
  setAnalytics: (analytics: ShareAnalytics | null) => void;

  // Loading state setters
  setLoadingInvitations: (isLoading: boolean) => void;
  setLoadingSettings: (isLoading: boolean) => void;
  setLoadingAnalytics: (isLoading: boolean) => void;
  setSendingInvitation: (isSending: boolean) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  isOpen: false,
  meetingId: null,
  workspaceSlug: null,
  activeTab: "public-link" as ShareDialogTab,
  isLoading: false,
  isLoadingInvitations: false,
  isLoadingSettings: false,
  isLoadingAnalytics: false,
  isSendingInvitation: false,
  invitations: [],
  settings: null,
  analytics: null,
  inviteEmail: "",
  invitePermission: "viewer" as SharePermission,
  showPreview: false,
  error: null,
};

export const useShareDialogStore = create<ShareDialogState>()((set) => ({
  ...initialState,

  // Dialog actions
  openDialog: (meetingId, workspaceSlug) =>
    set({
      isOpen: true,
      meetingId,
      workspaceSlug,
      error: null,
    }),

  closeDialog: () =>
    set({
      isOpen: false,
      error: null,
    }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  // Form actions
  setInviteEmail: (email) => set({ inviteEmail: email }),
  setInvitePermission: (permission) => set({ invitePermission: permission }),
  togglePreview: () => set((state) => ({ showPreview: !state.showPreview })),
  setError: (error) => set({ error }),

  // Loading actions
  setLoading: (isLoading) => set({ isLoading }),
  setLoadingInvitations: (isLoading) => set({ isLoadingInvitations: isLoading }),
  setLoadingSettings: (isLoading) => set({ isLoadingSettings: isLoading }),
  setLoadingAnalytics: (isLoading) => set({ isLoadingAnalytics: isLoading }),
  setSendingInvitation: (isSending) => set({ isSendingInvitation: isSending }),

  // Data actions
  setInvitations: (invitations) => set({ invitations }),
  addInvitation: (invitation) =>
    set((state) => ({
      invitations: [invitation, ...state.invitations],
      inviteEmail: "",
    })),
  removeInvitation: (invitationId) =>
    set((state) => ({
      invitations: state.invitations.filter((i) => i.id !== invitationId),
    })),
  setSettings: (settings) => set({ settings }),
  setAnalytics: (analytics) => set({ analytics }),

  // Reset
  reset: () => set(initialState),
}));

// Selector hooks for common use cases
export const useShareDialogOpen = () =>
  useShareDialogStore((state) => state.isOpen);

export const useShareDialogActiveTab = () =>
  useShareDialogStore((state) => state.activeTab);

export const useShareDialogAnalytics = () =>
  useShareDialogStore((state) => state.analytics);

export const useShareDialogInvitations = () =>
  useShareDialogStore((state) => state.invitations);
