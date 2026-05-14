import { Platform } from 'react-native';
import { SlotId } from '../types';

export const MAX_RESHUFFLE_COUNT = 3;
export const DAILY_FREE_RESHUFFLE_COUNT = 1;

export const DEFAULT_PUSH_TIME = '09:00';

export const MAX_DAILY_ACTIONS = 3;

export const DAILY_SLOTS: ReadonlyArray<{
  id: SlotId;
  label: string;
  time: string;
  hour: number;
  minute: number;
}> = [
  { id: 'morning', label: '아침', time: '07:00', hour: 7, minute: 0 },
  { id: 'lunch', label: '점심', time: '12:30', hour: 12, minute: 30 },
  { id: 'evening', label: '저녁', time: '19:00', hour: 19, minute: 0 },
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

export const ADMOB_REWARDED_AD_UNIT_ID = Platform.select({
  ios: 'ca-app-pub-5402672709504975/7787411749',
  android: 'ca-app-pub-5402672709504975/2535085062',
  default: 'ca-app-pub-5402672709504975/2535085062',
}) as string;

export const ADMOB_BANNER_AD_UNIT_ID = Platform.select({
  ios: 'ca-app-pub-5402672709504975/2831658029',
  android: 'ca-app-pub-5402672709504975/8742248224',
  default: 'ca-app-pub-5402672709504975/8742248224',
}) as string;

export const APP_VERSION = '1.0.1';

export const MediaType = {
  PHOTO: 'photo',
  VIDEO: 'video',
  BOTH: 'both',
} as const;

export const MAX_VIDEO_DURATION = 10;
