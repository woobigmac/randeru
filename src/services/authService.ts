import { login, logout, unlink, me, KakaoUser } from '@react-native-kakao/user';

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
