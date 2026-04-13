import { create } from 'zustand';
import { User, Tone } from '../types';

interface UserState {
  user: User | null;
  isOnboardingComplete: boolean;
  setUser: (user: User) => void;
  updateNickname: (nickname: string) => void;
  updateTones: (tones: Tone[]) => void;
  updatePushSettings: (enabled: boolean, time: string) => void;
  setOnboardingComplete: (value: boolean) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isOnboardingComplete: false,

  setUser: (user) => set({ user }),

  updateNickname: (nickname) =>
    set((state) => ({
      user: state.user ? { ...state.user, nickname } : null,
    })),

  updateTones: (selected_tones) =>
    set((state) => ({
      user: state.user ? { ...state.user, selected_tones } : null,
    })),

  updatePushSettings: (push_enabled, push_time) =>
    set((state) => ({
      user: state.user ? { ...state.user, push_enabled, push_time } : null,
    })),

  setOnboardingComplete: (value) => set({ isOnboardingComplete: value }),

  clearUser: () => set({ user: null, isOnboardingComplete: false }),
}));
