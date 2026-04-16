export type Tone = 'kind' | 'sense' | 'connect' | 'environment';

export type ActionStatus = 'not_received' | 'accepted' | 'completed' | 'shared';

export interface User {
  user_id: string;
  nickname: string;
  selected_tones: Tone[];
  push_enabled: boolean;
  push_time: string; // 'HH:MM' format
  created_at: Date;
}

export interface Action {
  action_id: string;
  title: string;
  description: string;
  category: Tone;
  difficulty: 'easy' | 'medium' | 'hard';
  estimated_time: number; // 분 단위
  place_tag: string;
  safety_note?: string;
  is_active: boolean;
  is_photo_required: boolean;
  share_copy_template: string;
  /** 액션에서 허용하는 미디어 종류. 미설정 시 'photo'로 동작한다. */
  media_type?: 'photo' | 'video' | 'both';
}

export interface DailyRecord {
  record_id: string;
  user_id: string;
  action_id: string;
  action_date: string; // 'YYYY-MM-DD' format
  status: 'accepted' | 'completed' | 'shared';
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
  // ─── 미디어 확장 필드 ────────────────────────────────────────────────────
  /** 사진 또는 영상 URL */
  media_url?: string;
  /** 실제 기록된 미디어 타입 */
  media_type?: 'photo' | 'video';
  /** 영상이면 영상 URL과 동일, 사진이면 photo_url과 동일 */
  thumbnail_url?: string;
}
