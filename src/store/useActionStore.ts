import { create } from 'zustand';
import { Action } from '../types';

interface ActionState {
  todayAction: Action | null;
  reshuffleCount: number;
  setTodayAction: (action: Action) => void;
  incrementReshuffleCount: () => void;
  resetReshuffleCount: () => void;
  clearAction: () => void;
}

export const useActionStore = create<ActionState>((set) => ({
  todayAction: null,
  reshuffleCount: 0,

  setTodayAction: (action) => set({ todayAction: action }),

  incrementReshuffleCount: () =>
    set((state) => ({ reshuffleCount: state.reshuffleCount + 1 })),

  resetReshuffleCount: () => set({ reshuffleCount: 0 }),

  clearAction: () => set({ todayAction: null, reshuffleCount: 0 }),
}));
