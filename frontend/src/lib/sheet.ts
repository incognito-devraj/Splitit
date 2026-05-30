import { create } from "zustand";

type SheetState = {
  open: boolean;
  presetCategory?: string;
  openSheet: (presetCategory?: string) => void;
  closeSheet: () => void;
};

export const useSheet = create<SheetState>((set) => ({
  open: false,
  openSheet: (presetCategory) => set({ open: true, presetCategory }),
  closeSheet: () => set({ open: false, presetCategory: undefined }),
}));
