import {
  collection,
  doc,
  increment,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { Action, SlotId } from '../types';

export type ActionActivityEvent =
  | 'received'
  | 'accepted'
  | 'reshuffled'
  | 'completed'
  | 'shared';

type ActivityDetails = {
  record_id?: string;
  slot_id?: SlotId;
  reshuffle_count?: number;
  used_ad?: boolean;
  next_action_id?: string;
  has_media?: boolean;
  captured_media_type?: 'photo' | 'video';
  memo_written?: boolean;
  share_channel?: string;
};

const countFieldByEvent: Record<ActionActivityEvent, string> = {
  received: 'received_count',
  accepted: 'accepted_count',
  reshuffled: 'reshuffled_count',
  completed: 'completed_count',
  shared: 'shared_count',
};

const compact = <T extends Record<string, unknown>>(value: T): T => {
  const entries = Object.entries(value).filter(([, v]) => v !== undefined);
  return Object.fromEntries(entries) as T;
};

async function writeActionActivity(
  userId: string,
  action: Action,
  event: ActionActivityEvent,
  details: ActivityDetails = {},
): Promise<void> {
  const batch = writeBatch(db);
  const eventRef = doc(collection(db, 'users', userId, 'action_activity_events'));
  const statsRef = doc(db, 'users', userId, 'action_stats', action.action_id);
  const now = serverTimestamp();

  const actionSnapshot = {
    action_id: action.action_id,
    title: action.title,
    category: action.category,
    difficulty: action.difficulty,
    estimated_time: action.estimated_time,
    place_tag: action.place_tag,
    media_type: action.media_type ?? null,
  };

  batch.set(eventRef, compact({
    user_id: userId,
    event,
    ...actionSnapshot,
    ...details,
    created_at: now,
  }));

  batch.set(
    statsRef,
    compact({
      user_id: userId,
      ...actionSnapshot,
      [countFieldByEvent[event]]: increment(1),
      last_event: event,
      last_event_at: now,
      updated_at: now,
    }),
    { merge: true },
  );

  await batch.commit();
}

export function trackActionActivity(
  userId: string | undefined,
  action: Action | null | undefined,
  event: ActionActivityEvent,
  details: ActivityDetails = {},
): void {
  if (!userId || !action?.action_id) return;
  void writeActionActivity(userId, action, event, details).catch((e) => {
    console.warn('[ActionActivity] 활동 데이터 저장 실패:', e);
  });
}
