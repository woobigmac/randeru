import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { loginWithKakao as kakaoLogin, logoutKakao, unlinkKakao } from '../services/authService';
import { User, Tone } from '../types';
import { DEFAULT_PUSH_TIME } from '../constants';

const STORAGE_KEY_USER = 'user';
const STORAGE_KEY_ONBOARDING = 'isOnboardingComplete';

const generateUserId = (): string =>
  `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

interface UserState {
  user: User | null;
  isOnboardingComplete: boolean;
  isLoggedIn: boolean;
  isLoading: boolean;

  loadUser: () => Promise<void>;
  loginWithKakao: () => Promise<{ isNewUser: boolean }>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  setNickname: (nickname: string) => Promise<void>;
  setSelectedTones: (tones: Tone[]) => Promise<void>;
  setAge: (age: number) => Promise<void>;
  setPushSettings: (enabled: boolean, time: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  clearUser: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  isOnboardingComplete: false,
  isLoggedIn: false,
  isLoading: true,

  loadUser: async () => {
    try {
      set({ isLoading: true });
      const [userJson, onboardingFlag] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_USER),
        AsyncStorage.getItem(STORAGE_KEY_ONBOARDING),
      ]);

      const parsed = userJson ? (JSON.parse(userJson) as User) : null;

      // loginType이 없는 구버전 데이터는 로그인 안 된 상태로 처리하고 초기화
      if (parsed && !parsed.loginType) {
        await AsyncStorage.multiRemove([STORAGE_KEY_USER, STORAGE_KEY_ONBOARDING]);
        set({ user: null, isOnboardingComplete: false, isLoggedIn: false });
        return;
      }

      const user = parsed;
      const isOnboardingComplete = onboardingFlag === 'true';
      const isLoggedIn = !!user;
      set({ user, isOnboardingComplete, isLoggedIn });
    } catch (e) {
      console.error('loadUser error:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  loginWithKakao: async () => {
    const { kakaoId, nickname, profileImage } = await kakaoLogin();
    const docId = `kakao_${kakaoId}`;
    const docRef = doc(db, 'users', docId);
    const docSnap = await getDoc(docRef);

    let user: User;
    let isNewUser: boolean;

    if (docSnap.exists()) {
      // 기존 유저 — Firestore 데이터 복원
      user = docSnap.data() as User;
      isNewUser = false;
    } else {
      // 신규 유저 생성
      user = {
        user_id: docId,
        nickname,
        kakaoId,
        profileImage,
        loginType: 'kakao',
        selected_tones: [],
        push_enabled: true,
        push_time: DEFAULT_PUSH_TIME,
        created_at: new Date(),
        age: 20,
      };
      await setDoc(docRef, user);
      isNewUser = true;
    }

    await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    if (!isNewUser) {
      await AsyncStorage.setItem(STORAGE_KEY_ONBOARDING, 'true');
    }

    set({
      user,
      isLoggedIn: true,
      isOnboardingComplete: !isNewUser,
    });

    return { isNewUser };
  },

  loginAsGuest: async () => {
    const user: User = {
      user_id: generateUserId(),
      nickname: '게스트',
      loginType: 'guest',
      selected_tones: [],
      push_enabled: true,
      push_time: DEFAULT_PUSH_TIME,
      created_at: new Date(),
      age: 20,
    };

    await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    set({ user, isLoggedIn: true, isOnboardingComplete: false });
  },

  logout: async () => {
    const { user } = get();
    if (user?.loginType === 'kakao') {
      try {
        await logoutKakao();
      } catch (e) {
        console.warn('logoutKakao error:', e);
      }
    }
    await get().clearUser();
  },

  deleteAccount: async () => {
    const { user } = get();
    if (user?.loginType === 'kakao') {
      try {
        await unlinkKakao();
      } catch (e) {
        console.warn('unlinkKakao error:', e);
      }
    }
    await get().clearUser();
  },

  setNickname: async (nickname) => {
    const currentUser = get().user;
    const user: User = currentUser ?? {
      user_id: generateUserId(),
      nickname,
      loginType: 'guest',
      selected_tones: [],
      push_enabled: true,
      push_time: DEFAULT_PUSH_TIME,
      created_at: new Date(),
      age: 20,
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

  setAge: async (age) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const updated = { ...currentUser, age };
    set({ user: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
    } catch (e) {
      console.error('setAge save error:', e);
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
    set({ user: null, isOnboardingComplete: false, isLoggedIn: false });
    try {
      await AsyncStorage.multiRemove([STORAGE_KEY_USER, STORAGE_KEY_ONBOARDING]);
    } catch (e) {
      console.error('clearUser error:', e);
    }
  },
}));
