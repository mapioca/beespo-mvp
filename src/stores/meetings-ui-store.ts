import { create } from "zustand"

interface MeetingsUiState {
  isCategoryNavigating: boolean
  setCategoryNavigating: (value: boolean) => void
}

export const useMeetingsUiStore = create<MeetingsUiState>((set) => ({
  isCategoryNavigating: false,
  setCategoryNavigating: (value) => set({ isCategoryNavigating: value }),
}))

