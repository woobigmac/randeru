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
  age?: number;
  gender?: 'male' | 'female' | null;
  loginType: 'kakao' | 'apple' | 'guest';
  kakaoId?: string;
  profileImage?: string;
  firebase_uid?: string;
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
  source?: 'daily' | 'friend_share';
  status: 'accepted' | 'completed' | 'shared';
  slot_id?: SlotId; // undefined = 기존 데이터 → morning으로 처리
  /** @deprecated media_url을 사용하세요 */
  photo_url?: string;
  /** @deprecated media_url 존재 여부로 대체됩니다 */
  photo_uploaded: boolean;
  memo?: string;
  reshuffle_count: number;
  free_reshuffle_used?: boolean;
  ad_reshuffle_count?: number;
  accepted_at?: Date;
  completed_at?: Date;
  shared_at?: Date;
  share_channel?: string;
  media_url?: string;
  media_type?: 'photo' | 'video';
  thumbnail_url?: string;
  friend_action_session_id?: string;
  friend_action_share_id?: string;
  friend_participants?: FriendActionParticipant[];
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

export type FriendInviteStatus = 'pending' | 'accepted' | 'expired';

export interface FriendInvite {
  invite_id: string;
  invite_code: string;
  inviter_id: string;
  inviter_nickname: string;
  inviter_profile_image?: string;
  status: FriendInviteStatus;
  accepted_by?: string;
  accepted_by_nickname?: string;
  created_at?: Date;
  expires_at?: Date;
  accepted_at?: Date;
}

export interface Friend {
  friend_user_id: string;
  nickname: string;
  profileImage?: string;
  status: 'active' | 'deleted';
  source_invite_id?: string;
  created_at?: Date;
}

export interface FriendActionParticipant {
  user_id: string;
  nickname: string;
  profileImage?: string | null;
  status: 'joined' | 'in_progress' | 'completed' | 'cancelled';
  completed_at?: Date;
}

export type FriendActionShareStatus = 'sent' | 'opened' | 'started' | 'completed' | 'cancelled';

export interface FriendActionShare {
  share_id: string;
  sender_id: string;
  sender_nickname: string;
  sender_profile_image?: string;
  recipient_id: string;
  recipient_nickname: string;
  action_id: string;
  action_title: string;
  action_description: string;
  status: FriendActionShareStatus;
  sender_record_id?: string;
  record_id?: string;
  created_at?: Date;
  started_at?: Date;
  completed_at?: Date;
}

export type InAppNotificationType =
  | 'friend_invite_accepted'
  | 'friend_action_shared'
  | 'friend_action_started'
  | 'friend_action_completed';

export interface InAppNotification {
  notification_id: string;
  user_id: string;
  type: InAppNotificationType;
  title: string;
  body: string;
  is_read: boolean;
  related_user_id?: string;
  related_user_nickname?: string;
  action_id?: string;
  action_title?: string;
  friend_action_share_id?: string;
  created_at?: Date;
  read_at?: Date;
}
