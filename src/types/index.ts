export type Tone = 'kind' | 'sense' | 'connect' | 'environment';
export type SlotId = 'morning' | 'lunch' | 'evening';
export type ActionStatus = 'not_received' | 'accepted' | 'completed' | 'shared';

export interface User {
  user_id: string;
  nickname: string;
  push_enabled: boolean;
  push_time: string;
  push_slots?: { morning: boolean; lunch: boolean; evening: boolean };
  created_at: Date;
  age: number;
  loginType: 'kakao' | 'apple' | 'guest';
  kakaoId?: string;
  profileImage?: string;
}

export interface Action {
  action_id: string;
  title: string;
  description: string;
  category: Tone;
  difficulty: 'easy' | 'medium' | 'hard';
  estimated_time: number;
  place_tag: string;
  safety_note?: string;
  is_active: boolean;
  is_photo_required: boolean;
  share_copy_template: string;
  media_type?: 'photo' | 'video' | 'both';
}

export interface DailyRecord {
  record_id: string;
  user_id: string;
  action_id: string;
  action_date: string;
  status: 'accepted' | 'completed' | 'shared';
  slot_id?: SlotId; // undefined = 기존 데이터 → morning으로 처리
  /** @deprecated media_url을 사용하세요 */
  photo_url?: string;
  /** @deprecated media_url 존재 여부로 대체됩니다 */
  photo_uploaded: boolean;
  memo?: string;
  reshuffle_count: number;
  accepted_at?: Date;
  completed_at?: Date;
  shared_at?: Date;
  share_channel?: string;
  media_url?: string;
  media_type?: 'photo' | 'video';
  thumbnail_url?: string;
}

export interface DailySlotStatus {
  slot_id: SlotId;
  label: string;
  time: string;
  isAvailable: boolean;
  record: DailyRecord | null;
  action: Action | null;
  status: 'locked' | 'available' | 'accepted' | 'completed';
}
