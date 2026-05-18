import { login, logout, unlink, me, KakaoUser } from '@react-native-kakao/user';
import * as AppleAuthentication from 'expo-apple-authentication';

// ─── 카카오 ──────────────────────────────────────────────────────────────────

export interface KakaoLoginResult {
  kakaoId: string;
  nickname: string;
  profileImage?: string;
}

export async function loginWithKakao(): Promise<KakaoLoginResult> {
  await login();
  const profile: KakaoUser = await me();
  return {
    kakaoId: String(profile.id),
    nickname: profile.nickname ?? '랜데루 유저',
    profileImage: profile.profileImageUrl ?? undefined,
  };
}

export async function logoutKakao(): Promise<void> {
  await logout();
}

export async function unlinkKakao(): Promise<void> {
  await unlink();
}

// ─── 애플 ────────────────────────────────────────────────────────────────────

export interface AppleLoginResult {
  appleId: string;
  email?: string;
  fullName?: string;
}

const getAppleAuthErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  const appleError = error as { code?: unknown; nativeErrorCode?: unknown };
  if (typeof appleError.code === 'string') return appleError.code;
  if (typeof appleError.nativeErrorCode === 'string') return appleError.nativeErrorCode;
  return undefined;
};

const getAppleAuthErrorMessage = (code?: string): string => {
  switch (code) {
    case '1001':
    case 'ERR_REQUEST_CANCELED':
      return 'Apple 로그인이 취소됐어요.';
    case 'ERR_REQUEST_FAILED':
    case 'ERR_INVALID_RESPONSE':
      return 'Apple 로그인 응답이 올바르지 않아요. 다시 시도해주세요.';
    case 'ERR_REQUEST_NOT_HANDLED':
      return 'Apple 로그인 요청을 처리하지 못했어요. 다시 시도해주세요.';
    case 'ERR_UNAVAILABLE':
    case 'ERR_NOT_AVAILABLE':
      return 'Apple 로그인은 iOS 13 이상의 실제 기기에서만 지원됩니다.';
    default:
      return 'Apple 로그인에 실패했어요. 다시 시도해주세요.';
  }
};

const withAppleAuthCode = (message: string, code?: string): Error => {
  const error = new Error(message) as Error & { code?: string };
  error.code = code;
  return error;
};

export async function loginWithApple(): Promise<AppleLoginResult> {
  console.log('[Apple Login] 시작');

  const isAvailable = await AppleAuthentication.isAvailableAsync();
  console.log('[Apple Login] available:', isAvailable);

  if (!isAvailable) {
    throw new Error('Apple 로그인은 iOS 13 이상의 실제 기기에서만 지원됩니다.');
  }

  try {
    console.log('[Apple Login] signInAsync 시작');
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    console.log('[Apple Login] credential:', {
      user: credential.user,
      identityToken: !!credential.identityToken,
      email: !!credential.email,
      fullName: !!credential.fullName,
    });

    if (!credential.user) {
      console.warn('[Apple Login] credential.user 없음');
      throw new Error('Apple 로그인 사용자 정보를 받을 수 없어요. 다시 시도해주세요.');
    }

    const nameParts = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter((s): s is string => !!s);
    const fullName = nameParts.length > 0 ? nameParts.join(' ') : undefined;

    console.log('[Apple Login] 완료');

    return {
      appleId: credential.user,
      email: credential.email ?? undefined,
      fullName,
    };
  } catch (error) {
    const code = getAppleAuthErrorCode(error);
    console.error('[Apple Login] 실패:', {
      code,
      message: error instanceof Error ? error.message : String(error),
    });

    if (!code && error instanceof Error) {
      throw error;
    }

    throw withAppleAuthCode(getAppleAuthErrorMessage(code), code);
  }
}

/**
 * Apple은 클라이언트 사이드 로그아웃만 지원합니다.
 * 로컬 상태 초기화는 clearUser()에서 처리합니다.
 */
export function logoutApple(): void {
  // no-op: Apple SDK에는 별도 로그아웃 API 없음
}
