import { Linking, Platform, Share } from 'react-native';
import { shareFeedTemplate } from '@react-native-kakao/share';
import { FriendInvite } from '../types';
import { getInviteShareMessage } from './friendService';

// 카카오톡 미설치 시 노출할 앱스토어 링크
const IOS_APP_STORE_URL = 'https://apps.apple.com/app/id6746736399';
const ANDROID_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.randeru.app';

async function isKakaoTalkAvailable(): Promise<boolean> {
  try {
    return await Linking.canOpenURL('kakaolink://');
  } catch {
    return false;
  }
}

export async function shareInviteViaKakao(invite: FriendInvite): Promise<boolean> {
  const available = await isKakaoTalkAvailable();
  if (!available) return false;

  const storeUrl = Platform.OS === 'android' ? ANDROID_PLAY_STORE_URL : IOS_APP_STORE_URL;

  await shareFeedTemplate({
    template: {
      content: {
        title: '하루에 하나, 인간다운 액션 🪻',
        description: `${invite.inviter_nickname}님이 랜데루로 초대했어요.\n초대 코드: ${invite.invite_code}`,
        imageUrl: 'https://firebasestorage.googleapis.com/v0/b/randeru-29e21.firebasestorage.app/o/randeru_og_image.jpg?alt=media&token=f54f3c77-c67e-47c4-9546-9474458338cf',
        link: {
          mobileWebUrl: storeUrl,
          webUrl: storeUrl,
          iosExecutionParams: { inviteCode: invite.invite_code },
          androidExecutionParams: { inviteCode: invite.invite_code },
        },
      },
      buttons: [
        {
          title: '랜데루에서 열기',
          link: {
            mobileWebUrl: storeUrl,
            webUrl: storeUrl,
            iosExecutionParams: { inviteCode: invite.invite_code },
            androidExecutionParams: { inviteCode: invite.invite_code },
          },
        },
      ],
    },
    useWebBrowserIfKakaoTalkNotAvailable: false,
  });

  return true;
}

// 카카오 공유 시도 후 실패하면 OS 기본 Share로 폴백
export async function shareInvite(invite: FriendInvite): Promise<void> {
  try {
    const sent = await shareInviteViaKakao(invite);
    if (!sent) {
      await Share.share({ message: getInviteShareMessage(invite) });
    }
  } catch {
    // 카카오 공유 중 예외 발생 시 RN Share로 폴백
    await Share.share({ message: getInviteShareMessage(invite) });
  }
}
