import { login, logout, unlink, me, KakaoUser } from '@react-native-kakao/user';
import appleAuth, {
  AppleRequestOperation,
  AppleRequestScope,
} from '@invertase/react-native-apple-authentication';

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

export async function loginWithApple(): Promise<AppleLoginResult> {
  if (!appleAuth.isSupported) {
    throw new Error('Apple 로그인은 iOS 13 이상의 실제 기기에서만 지원됩니다.');
  }

  const response = await appleAuth.performRequest({
    requestedOperation: AppleRequestOperation.LOGIN,
    requestedScopes: [AppleRequestScope.EMAIL, AppleRequestScope.FULL_NAME],
  });

  if (!response.identityToken) {
    throw new Error('Apple 로그인에 실패했어요. 다시 시도해주세요.');
  }

  const nameParts = [response.fullName?.givenName, response.fullName?.familyName]
    .filter((s): s is string => !!s);
  const fullName = nameParts.length > 0 ? nameParts.join(' ') : undefined;

  return {
    appleId: response.user,
    email: response.email ?? undefined,
    fullName,
  };
}

/**
 * Apple은 클라이언트 사이드 로그아웃만 지원합니다.
 * 로컬 상태 초기화는 clearUser()에서 처리합니다.
 */
export function logoutApple(): void {
  // no-op: Apple SDK에는 별도 로그아웃 API 없음
}
