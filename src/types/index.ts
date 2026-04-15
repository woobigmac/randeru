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
}

export interface DailyRecord {
  record_id: string;
  user_id: string;
  action_id: string;
  action_date: string; // 'YYYY-MM-DD' format
  status: 'accepted' | 'completed' | 'shared';
  photo_url?: string;
  photo_uploaded: boolean;
  memo?: string;
  reshuffle_count: number;
  accepted_at?: Date;
  completed_at?: Date;
  shared_at?: Date;
  share_channel?: string;
}
