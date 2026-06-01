import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import {
  loginWithKakao as kakaoLogin,
  loginWithApple as appleLogin,
  logoutKakao,
  logoutApple,
  unlinkKakao,
} from '../services/authService';
import {
  signInToFirebaseAnonymously,
  signInToFirebaseWithAppleIdentityToken,
  signInToFirebaseWithKakaoAccessToken,
  signOutFirebaseAuth,
} from '../services/firebaseAuthService';
import { User } from '../types';
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
  loginWithApple: () => Promise<{ isNewUser: boolean }>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  setNickname: (nickname: string) => Promise<void>;
  setPushSettings: (enabled: boolean, time: string, slots?: { morning: boolean; lunch: boolean; evening: boolean }) => Promise<void>;
  updateProfile: (params: { nickname?: string; gender?: 'male' | 'female' | null; imageUri?: string }) => Promise<void>;
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
    const { kakaoId, nickname, profileImage, accessToken } = await kakaoLogin();
    let firebaseUid: string | undefined;
    if (accessToken) {
      try {
        const firebaseSession = await signInToFirebaseWithKakaoAccessToken(accessToken);
        firebaseUid = firebaseSession.uid;
      } catch (e) {
        console.warn('firebase kakao auth failed, continuing with existing kakao login:', e);
      }
    }

    const docId = `kakao_${kakaoId}`;
    const docRef = doc(db, 'users', docId);
    const docSnap = await getDoc(docRef);

    let user: User;
    let isNewUser: boolean;

    if (docSnap.exists()) {
      // 기존 유저 — Firestore 데이터 복원
      user = docSnap.data() as User;
      if (firebaseUid && user.firebase_uid !== firebaseUid) {
        user = { ...user, firebase_uid: firebaseUid };
        await setDoc(docRef, { firebase_uid: firebaseUid }, { merge: true });
      }
      isNewUser = false;
    } else {
      // 신규 유저 생성
      const kakaoProfileImage =
        typeof profileImage === 'string' && profileImage.length > 0 ? profileImage : undefined;
      user = {
        user_id: docId,
        nickname,
        kakaoId,
        loginType: 'kakao',
        push_enabled: false,
        push_time: DEFAULT_PUSH_TIME,
        created_at: new Date(),
        ...(kakaoProfileImage && { profileImage: kakaoProfileImage }),
        ...(firebaseUid && { firebase_uid: firebaseUid }),
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

  loginWithApple: async () => {
    const { appleId, fullName, identityToken } = await appleLogin();
    let firebaseUid: string | undefined;
    if (identityToken) {
      try {
        const firebaseSession = await signInToFirebaseWithAppleIdentityToken(identityToken);
        firebaseUid = firebaseSession.uid;
      } catch (e) {
        console.warn('firebase apple auth failed, continuing with existing apple login:', e);
      }
    }

    const docId = `apple_${appleId}`;
    const docRef = doc(db, 'users', docId);
    const docSnap = await getDoc(docRef);

    let user: User;
    let isNewUser: boolean;

    if (docSnap.exists()) {
      user = docSnap.data() as User;
      if (firebaseUid && user.firebase_uid !== firebaseUid) {
        user = { ...user, firebase_uid: firebaseUid };
        await setDoc(docRef, { firebase_uid: firebaseUid }, { merge: true });
      }
      isNewUser = false;
    } else {
      user = {
        user_id: docId,
        nickname: fullName ?? '랜데루 유저',
        loginType: 'apple',
        push_enabled: false,
        push_time: DEFAULT_PUSH_TIME,
        created_at: new Date(),
        ...(firebaseUid && { firebase_uid: firebaseUid }),
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
    let firebaseUid: string | undefined;
    try {
      const firebaseSession = await signInToFirebaseAnonymously();
      firebaseUid = firebaseSession.uid;
    } catch (e) {
      console.warn('firebase anonymous auth failed, continuing as local guest:', e);
    }

    const user: User = {
      user_id: generateUserId(),
      nickname: '게스트',
      loginType: 'guest',
      push_enabled: false,
      push_time: DEFAULT_PUSH_TIME,
      created_at: new Date(),
      ...(firebaseUid && { firebase_uid: firebaseUid }),
    };

    await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    if (firebaseUid) {
      try {
        await setDoc(doc(db, 'users', user.user_id), user, { merge: true });
      } catch (e) {
        console.warn('guest user firestore bootstrap failed:', e);
      }
    }
    set({ user, isLoggedIn: true, isOnboardingComplete: false });
  },

  logout: async () => {
    const { user } = get();
    try {
      if (user?.loginType === 'kakao') await logoutKakao();
      else if (user?.loginType === 'apple') logoutApple();
    } catch (e) {
      console.warn('logout error:', e);
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

  setPushSettings: async (push_enabled, push_time, push_slots?) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const updated = {
      ...currentUser,
      push_enabled,
      push_time,
      ...(push_slots !== undefined && { push_slots }),
    };
    set({ user: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
    } catch (e) {
      console.error('setPushSettings save error:', e);
    }
  },

  updateProfile: async ({ nickname, gender, imageUri }) => {
    const currentUser = get().user;
    if (!currentUser) return;

    let profileImage = currentUser.profileImage;
    if (imageUri) {
      try {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const storageRef = ref(storage, `profiles/${currentUser.user_id}.jpg`);
        await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
        profileImage = await getDownloadURL(storageRef);
      } catch (e) {
        console.error('profileImage upload error:', e);
      }
    }

    const updated: User = {
      ...currentUser,
      ...(nickname !== undefined && { nickname }),
      ...(gender !== undefined && { gender }),
      ...(profileImage !== undefined && { profileImage }),
    };

    set({ user: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
      if (currentUser.user_id) {
        await updateDoc(doc(db, 'users', currentUser.user_id), {
          ...(nickname !== undefined && { nickname }),
          ...(gender !== undefined && { gender }),
          ...(profileImage !== undefined && { profileImage }),
        });
      }
    } catch (e) {
      console.error('updateProfile save error:', e);
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
      await signOutFirebaseAuth().catch((e) => {
        console.warn('firebase auth signOut error:', e);
      });
      await AsyncStorage.multiRemove([STORAGE_KEY_USER, STORAGE_KEY_ONBOARDING]);
    } catch (e) {
      console.error('clearUser error:', e);
    }
  },
}));
