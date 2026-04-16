import { Platform } from 'react-native';
import { Tone } from '../types';

export const MAX_RESHUFFLE_COUNT = 3;

export const DEFAULT_PUSH_TIME = '09:00';

export const TONES: { id: Tone; label: string; description: string }[] = [
  {
    id: 'kind',
    label: '친절',
    description: '낯선 사람에게 따뜻한 말 한마디, 문 잡아주기 등 작은 친절을 실천해요.',
  },
  {
    id: 'sense',
    label: '감성',
    description: '감사 편지 쓰기, 기억에 남는 사진 찍기 등 감성적인 순간을 만들어요.',
  },
  {
    id: 'connect',
    label: '연결',
    description: '오랫동안 연락 못 했던 사람에게 안부를 전하고 관계를 이어가요.',
  },
  {
    id: 'environment',
    label: '환경',
    description: '텀블러 사용, 쓰레기 줍기 등 지구를 위한 작은 실천을 해요.',
  },
];

export const PUSH_MESSAGES: string[] = [
  '오늘의 작은 선행이 누군가의 하루를 바꿀 수 있어요 🌟',
  '어제보다 조금 더 나은 나를 만날 시간이에요 ✨',
  '오늘 하루, 세상을 조금 더 따뜻하게 만들어볼까요? 🌻',
  '작은 행동 하나가 큰 변화를 만들어요. 오늘도 함께해요 💪',
  '오늘의 루틴이 기다리고 있어요. 5분이면 충분해요! ⏰',
  '당신의 선행이 오늘 누군가에게 큰 힘이 될 거예요 🤝',
  '새로운 하루, 새로운 기회! 오늘의 랜데루를 확인해보세요 🎲',
  '작은 친절이 모여 세상을 바꿔요. 오늘도 함께 실천해요 🌍',
  '오늘 하루도 의미 있게 채워봐요. 랜데루가 함께할게요 💫',
  '당신의 일상 속 작은 변화가 시작될 시간이에요 🌱',
];

export const HASHTAGS: Record<string, string[]> = {
  kind: ['#친절', '#랜덤친절', '#선행', '#랜데루'],
  sense: ['#감성', '#감사', '#일상기록', '#랜데루'],
  connect: ['#연결', '#안부', '#따뜻한관계', '#랜데루'],
  environment: ['#환경', '#친환경', '#지구사랑', '#랜데루'],
  common: ['#오늘의루틴', '#랜덤데일리루틴', '#랜데루'],
};

// ─── AdMob 광고 단위 ID ────────────────────────────────────────────────────────
// 현재는 Google 공식 테스트 ID. 앱 출시 전 실제 ID로 교체 필요.
// iOS 실제 ID:     ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY
// Android 실제 ID: ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY

export const ADMOB_REWARDED_AD_UNIT_ID = Platform.select({
  ios: 'ca-app-pub-3940256099942544/1712485313',      // 테스트 ID
  android: 'ca-app-pub-3940256099942544/5224354917',  // 테스트 ID
  default: 'ca-app-pub-3940256099942544/5224354917',
}) as string;

export const ADMOB_BANNER_AD_UNIT_ID = Platform.select({
  ios: 'ca-app-pub-3940256099942544/2934735716',      // 테스트 ID
  android: 'ca-app-pub-3940256099942544/6300978111',  // 테스트 ID
  default: 'ca-app-pub-3940256099942544/6300978111',
}) as string;

export const APP_VERSION = '1.0.0';

export const MediaType = {
  PHOTO: 'photo',
  VIDEO: 'video',
  BOTH: 'both',
} as const;

export const MAX_VIDEO_DURATION = 15; // 초
