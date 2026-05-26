import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  onAuthStateChanged,
  OAuthProvider,
  signInAnonymously,
  signInWithCredential,
  signInWithCustomToken,
  signOut,
  type User as FirebaseAuthUser,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebase';

const DEFAULT_FUNCTIONS_REGION = 'asia-northeast3';
const functionsRegion =
  process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION || DEFAULT_FUNCTIONS_REGION;
const functions = getFunctions(app, functionsRegion);

const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
})();

export type FirebaseAuthSession = {
  uid: string;
  isAnonymous: boolean;
  providerIds: string[];
};

function mapFirebaseUser(user: FirebaseAuthUser): FirebaseAuthSession {
  return {
    uid: user.uid,
    isAnonymous: user.isAnonymous,
    providerIds: user.providerData.map((provider) => provider.providerId),
  };
}

export function getCurrentFirebaseAuthSession(): FirebaseAuthSession | null {
  return auth.currentUser ? mapFirebaseUser(auth.currentUser) : null;
}

export function observeFirebaseAuthSession(
  callback: (session: FirebaseAuthSession | null) => void,
): () => void {
  return onAuthStateChanged(auth, (user) => {
    callback(user ? mapFirebaseUser(user) : null);
  });
}

export async function signInToFirebaseAnonymously(): Promise<FirebaseAuthSession> {
  const credential = await signInAnonymously(auth);
  return mapFirebaseUser(credential.user);
}

export async function signInToFirebaseWithAppleIdentityToken(
  identityToken: string,
  rawNonce?: string,
): Promise<FirebaseAuthSession> {
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: identityToken,
    rawNonce,
  });
  const userCredential = await signInWithCredential(auth, credential);
  return mapFirebaseUser(userCredential.user);
}

export async function signInToFirebaseWithKakaoCustomToken(
  customToken: string,
): Promise<FirebaseAuthSession> {
  const credential = await signInWithCustomToken(auth, customToken);
  return mapFirebaseUser(credential.user);
}

export async function signInToFirebaseWithKakaoAccessToken(
  accessToken: string,
): Promise<FirebaseAuthSession> {
  const createKakaoCustomToken = httpsCallable<
    { accessToken: string },
    { customToken?: unknown }
  >(functions, 'createKakaoCustomToken');
  const result = await createKakaoCustomToken({ accessToken });
  const { customToken } = result.data;

  if (typeof customToken !== 'string' || !customToken) {
    throw new Error('Kakao Firebase custom token response is invalid.');
  }

  return signInToFirebaseWithKakaoCustomToken(customToken);
}

export async function signOutFirebaseAuth(): Promise<void> {
  await signOut(auth);
}
