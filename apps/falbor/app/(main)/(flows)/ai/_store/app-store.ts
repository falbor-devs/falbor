'use client';

import { create } from "zustand";
import { AppState } from "../_types";

// Store for app-wide state
interface AppStore {
  appState: AppState;
  setAppState: (state: AppState) => void;

  // UI state
  updateInstruction: string;
  setUpdateInstruction: (instruction: string) => void;

  // Update images support (multiple images)
  updateImages: string[];
  setUpdateImages: (images: string[]) => void;

  inSelectAndEditMode: boolean;
  toggleInSelectAndEditMode: () => void;
  disableInSelectAndEditMode: () => void;

  selectedElement: HTMLElement | null;
  setSelectedElement: (element: HTMLElement | null) => void;
  clearSelectedElement: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  appState: AppState.INITIAL,
  setAppState: (state: AppState) => set({ appState: state }),

  // UI state
  updateInstruction: "",
  setUpdateInstruction: (instruction: string) =>
    set({ updateInstruction: instruction }),

  // Update images support
  updateImages: [],
  setUpdateImages: (images: string[]) => set({ updateImages: images }),

  inSelectAndEditMode: false,
  toggleInSelectAndEditMode: () =>
    set((state) =>
      state.inSelectAndEditMode
        ? { inSelectAndEditMode: false, selectedElement: null }
        : { inSelectAndEditMode: true }
    ),
  // Exiting selection mode and releasing its locked target are one action.
  // Keeping this atomic prevents a stale iframe element from surviving a
  // version change until PreviewComponent's effects get a chance to run.
  disableInSelectAndEditMode: () =>
    set({ inSelectAndEditMode: false, selectedElement: null }),

  selectedElement: null,
  setSelectedElement: (element: HTMLElement | null) =>
    set({ selectedElement: element }),
  clearSelectedElement: () => set({ selectedElement: null }),
}));
