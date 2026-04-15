import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Action, DailyRecord, Tone } from '../types';

const getTodayDate = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
};

/**
 * 오늘 날짜로 해당 유저의 기록을 조회한다.
 * 없으면 null 반환.
 */
export async function getTodayAction(userId: string): Promise<DailyRecord | null> {
  try {
    const today = getTodayDate();
    const q = query(
      collection(db, 'records'),
      where('user_id', '==', userId),
      where('action_date', '==', today),
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const d = snapshot.docs[0];
    return { record_id: d.id, ...d.data() } as DailyRecord;
  } catch (e) {
    console.error('getTodayAction error:', e);
    return null;
  }
}

/**
 * Firestore 'actions' 컬렉션에서 액션 1개를 조회한다.
 */
export async function getActionById(actionId: string): Promise<Action | null> {
  try {
    const snap = await getDoc(doc(db, 'actions', actionId));
    if (!snap.exists()) return null;
    return { action_id: snap.id, ...snap.data() } as Action;
  } catch (e) {
    console.error('getActionById error:', e);
    return null;
  }
}

/**
 * is_active && is_photo_required인 액션 중 excludeIds를 제외하고 랜덤으로 1개 반환.
 * tones: MVP에서는 무시 (순수 랜덤). v2에서 가중치 랜덤 예정.
 */
export async function getRandomAction(
  excludeIds: string[],
  _tones: Tone[],
): Promise<Action | null> {
  try {
    const q = query(
      collection(db, 'actions'),
      where('is_active', '==', true),
      where('is_photo_required', '==', true),
    );
    const snapshot = await getDocs(q);

    const candidates = snapshot.docs
      .map((d) => ({ action_id: d.id, ...d.data() } as Action))
      .filter((a) => !excludeIds.includes(a.action_id));

    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  } catch (e) {
    console.error('getRandomAction error:', e);
    return null;
  }
}

/**
 * 'records' 컬렉션에 새 기록을 생성하고 DailyRecord를 반환한다.
 */
export async function acceptAction(
  userId: string,
  action: Action,
): Promise<DailyRecord> {
  const today = getTodayDate();
  const now = new Date();

  const payload = {
    user_id: userId,
    action_id: action.action_id,
    action_date: today,
    status: 'accepted' as const,
    photo_uploaded: false,
    reshuffle_count: 0,
    accepted_at: Timestamp.fromDate(now),
  };

  const ref = await addDoc(collection(db, 'records'), payload);

  return {
    record_id: ref.id,
    ...payload,
    accepted_at: now,
  };
}

/**
 * 기존 record의 action_id를 새 액션으로 교체하고 reshuffle_count를 +1한다.
 */
export async function reshuffleAction(
  recordId: string,
  newAction: Action,
  reshuffleCount: number,
): Promise<void> {
  try {
    await updateDoc(doc(db, 'records', recordId), {
      action_id: newAction.action_id,
      reshuffle_count: reshuffleCount + 1,
    });
  } catch (e) {
    console.error('reshuffleAction error:', e);
    throw e;
  }
}
