import { create } from 'zustand';

interface AppState {
  navigationCollapsed: boolean;
  setNavigationCollapsed: (collapsed: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  navigationCollapsed: false,
  setNavigationCollapsed: (navigationCollapsed) => set({ navigationCollapsed }),
}));
