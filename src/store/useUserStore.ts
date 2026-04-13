import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Tone } from '../types';
import { DEFAULT_PUSH_TIME } from '../constants';

const STORAGE_KEY_USER = 'user';
const STORAGE_KEY_ONBOARDING = 'isOnboardingComplete';

const generateUserId = (): string =>
  `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

interface UserState {
  user: User | null;
  isOnboardingComplete: boolean;
  isLoading: boolean;

  loadUser: () => Promise<void>;
  setNickname: (nickname: string) => Promise<void>;
  setSelectedTones: (tones: Tone[]) => Promise<void>;
  setPushSettings: (enabled: boolean, time: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  clearUser: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  isOnboardingComplete: false,
  isLoading: true,

  loadUser: async () => {
    try {
      set({ isLoading: true });
      const [userJson, onboardingFlag] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_USER),
        AsyncStorage.getItem(STORAGE_KEY_ONBOARDING),
      ]);

      const user = userJson ? (JSON.parse(userJson) as User) : null;
      const isOnboardingComplete = onboardingFlag === 'true';
      set({ user, isOnboardingComplete });
    } catch (e) {
      console.error('loadUser error:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  setNickname: async (nickname) => {
    const currentUser = get().user;
    const user: User = currentUser ?? {
      user_id: generateUserId(),
      nickname,
      selected_tones: [],
      push_enabled: true,
      push_time: DEFAULT_PUSH_TIME,
      created_at: new Date(),
    };
    const updated = { ...user, nickname };
    set({ user: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
    } catch (e) {
      console.error('setNickname save error:', e);
    }
  },

  setSelectedTones: async (tones) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const updated = { ...currentUser, selected_tones: tones };
    set({ user: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
    } catch (e) {
      console.error('setSelectedTones save error:', e);
    }
  },

  setPushSettings: async (push_enabled, push_time) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const updated = { ...currentUser, push_enabled, push_time };
    set({ user: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
    } catch (e) {
      console.error('setPushSettings save error:', e);
    }
  },

  completeOnboarding: async () => {
    set({ isOnboardingComplete: true });
    try {
      await AsyncStorage.setItem(STORAGE_KEY_ONBOARDING, 'true');
    } catch (e) {
      console.error('completeOnboarding save error:', e);
    }
  },

  clearUser: async () => {
    set({ user: null, isOnboardingComplete: false });
    try {
      await AsyncStorage.multiRemove([STORAGE_KEY_USER, STORAGE_KEY_ONBOARDING]);
    } catch (e) {
      console.error('clearUser error:', e);
    }
  },
}));
