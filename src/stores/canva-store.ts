import { create } from "zustand";
import type { EventDesign, ExportStatus } from "@/types/canva";

export interface CanvaState {
  // Modal state
  isModalOpen: boolean;
  eventId: string | null;
  eventTitle: string | null;

  // Designs for current event
  designs: EventDesign[];
  isLoadingDesigns: boolean;

  // Create design state
  isCreating: boolean;
  createError: string | null;

  // Export state
  exportingDesignId: string | null;
  exportProgress: number;
  exportError: string | null;

  // Actions
  openModal: (eventId: string, eventTitle: string) => void;
  closeModal: () => void;

  // Design actions
  setDesigns: (designs: EventDesign[]) => void;
  addDesign: (design: EventDesign) => void;
  updateDesign: (designId: string, updates: Partial<EventDesign>) => void;
  removeDesign: (designId: string) => void;
  setLoadingDesigns: (isLoading: boolean) => void;

  // Create actions
  setCreating: (isCreating: boolean) => void;
  setCreateError: (error: string | null) => void;

  // Export actions
  startExport: (designId: string) => void;
  updateExportProgress: (progress: number) => void;
  completeExport: (designId: string, publicUrl: string, storagePath: string) => void;
  failExport: (error: string) => void;
  clearExportState: () => void;

  // Reset
  reset: () => void;
}

const initialState = {
  isModalOpen: false,
  eventId: null as string | null,
  eventTitle: null as string | null,
  designs: [] as EventDesign[],
  isLoadingDesigns: false,
  isCreating: false,
  createError: null as string | null,
  exportingDesignId: null as string | null,
  exportProgress: 0,
  exportError: null as string | null,
};

export const useCanvaStore = create<CanvaState>()((set) => ({
  ...initialState,

  // Modal actions
  openModal: (eventId, eventTitle) =>
    set({
      isModalOpen: true,
      eventId,
      eventTitle,
      createError: null,
      exportError: null,
    }),

  closeModal: () =>
    set({
      isModalOpen: false,
      createError: null,
      exportError: null,
    }),

  // Design actions
  setDesigns: (designs) => set({ designs }),

  addDesign: (design) =>
    set((state) => ({
      designs: [design, ...state.designs],
    })),

  updateDesign: (designId, updates) =>
    set((state) => ({
      designs: state.designs.map((d) =>
        d.id === designId ? { ...d, ...updates } : d
      ),
    })),

  removeDesign: (designId) =>
    set((state) => ({
      designs: state.designs.filter((d) => d.id !== designId),
    })),

  setLoadingDesigns: (isLoading) => set({ isLoadingDesigns: isLoading }),

  // Create actions
  setCreating: (isCreating) => set({ isCreating, createError: null }),
  setCreateError: (error) => set({ createError: error, isCreating: false }),

  // Export actions
  startExport: (designId) =>
    set({
      exportingDesignId: designId,
      exportProgress: 0,
      exportError: null,
    }),

  updateExportProgress: (progress) => set({ exportProgress: progress }),

  completeExport: (designId, publicUrl, storagePath) =>
    set((state) => ({
      exportingDesignId: null,
      exportProgress: 100,
      designs: state.designs.map((d) =>
        d.id === designId
          ? {
              ...d,
              export_status: "completed" as ExportStatus,
              public_url: publicUrl,
              storage_path: storagePath,
            }
          : d
      ),
    })),

  failExport: (error) =>
    set({
      exportError: error,
      exportingDesignId: null,
      exportProgress: 0,
    }),

  clearExportState: () =>
    set({
      exportingDesignId: null,
      exportProgress: 0,
      exportError: null,
    }),

  // Reset
  reset: () => set(initialState),
}));

// Selector hooks
export const useCanvaModalOpen = () => useCanvaStore((state) => state.isModalOpen);

export const useCanvaDesigns = () => useCanvaStore((state) => state.designs);

export const useCanvaCurrentEvent = () =>
  useCanvaStore((state) => ({
    eventId: state.eventId,
    eventTitle: state.eventTitle,
  }));

export const useCanvaIsCreating = () => useCanvaStore((state) => state.isCreating);

export const useCanvaExportState = () =>
  useCanvaStore((state) => ({
    exportingDesignId: state.exportingDesignId,
    exportProgress: state.exportProgress,
    exportError: state.exportError,
  }));

export const useDesignById = (designId: string) =>
  useCanvaStore((state) => state.designs.find((d) => d.id === designId));
