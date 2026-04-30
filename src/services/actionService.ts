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
import { Action, DailyRecord, DailySlotStatus, SlotId, Tone } from '../types';
import { DAILY_SLOTS } from '../constants';

const getTodayDate = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
};

/** 현재 기기 시각 기준으로 슬롯 활성화 여부를 반환한다. */
function isSlotAvailable(hour: number, minute: number): boolean {
  const now = new Date();
  return now.getHours() > hour || (now.getHours() === hour && now.getMinutes() >= minute);
}

/**
 * 오늘 날짜로 해당 유저의 기록을 조회한다. (하위 호환 — 단일 record)
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
 * 오늘 3개 슬롯의 상태를 반환한다.
 * - slot_id 없는 기존 record는 'morning'으로 처리한다.
 */
const firestoreTimeout = <T>(promise: Promise<T>, ms = 10000): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('firestore_timeout')), ms),
    ),
  ]);

export async function getTodaySlots(userId: string): Promise<DailySlotStatus[]> {
  try {
    const today = getTodayDate();
    const q = query(
      collection(db, 'records'),
      where('user_id', '==', userId),
      where('action_date', '==', today),
    );
    const snapshot = await firestoreTimeout(getDocs(q));
    const todayRecords = snapshot.docs.map(
      (d) => ({ record_id: d.id, ...d.data() } as DailyRecord),
    );

    // action 일괄 조회
    const actionIds = [...new Set(todayRecords.map((r) => r.action_id))];
    const actionMap: Record<string, Action> = {};
    await Promise.all(
      actionIds.map(async (id) => {
        const snap = await getDoc(doc(db, 'actions', id));
        if (snap.exists()) actionMap[id] = { action_id: snap.id, ...snap.data() } as Action;
      }),
    );

    return DAILY_SLOTS.map((slot) => {
      const record =
        todayRecords.find((r) => (r.slot_id ?? 'morning') === slot.id) ?? null;
      const action = record ? (actionMap[record.action_id] ?? null) : null;
      const available = isSlotAvailable(slot.hour, slot.minute);

      let status: DailySlotStatus['status'];
      if (!available) {
        status = 'locked';
      } else if (!record) {
        status = 'available';
      } else if (record.status === 'completed' || record.status === 'shared') {
        status = 'completed';
      } else {
        status = 'accepted';
      }

      return { slot_id: slot.id, label: slot.label, time: slot.time, isAvailable: available, record, action, status };
    });
  } catch (e) {
    console.error('getTodaySlots error:', e);
    return DAILY_SLOTS.map((slot) => ({
      slot_id: slot.id,
      label: slot.label,
      time: slot.time,
      isAvailable: isSlotAvailable(slot.hour, slot.minute),
      record: null,
      action: null,
      status: isSlotAvailable(slot.hour, slot.minute) ? 'available' : 'locked',
    }));
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
 * 랜덤 액션 1개 반환.
 */
export async function getRandomAction(
  excludeIds: string[],
  _tones: Tone[],
): Promise<Action | null> {
  try {
    const q = query(
      collection(db, 'actions'),
      where('is_active', '==', true),
    );
    const snapshot = await firestoreTimeout(getDocs(q));
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
 * 슬롯에 새 record를 생성한다. slot_id 포함.
 */
export async function acceptSlotAction(
  userId: string,
  action: Action,
  slotId: SlotId,
): Promise<DailyRecord> {
  const today = getTodayDate();
  const now = new Date();

  const payload = {
    user_id: userId,
    action_id: action.action_id,
    action_date: today,
    slot_id: slotId,
    status: 'accepted' as const,
    photo_uploaded: false,
    reshuffle_count: 0,
    accepted_at: Timestamp.fromDate(now),
  };

  const ref = await addDoc(collection(db, 'records'), payload);
  return { record_id: ref.id, ...payload, accepted_at: now };
}

/**
 * 하위 호환: 슬롯 없는 단일 record 생성.
 */
export async function acceptAction(userId: string, action: Action): Promise<DailyRecord> {
  return acceptSlotAction(userId, action, 'morning');
}

/**
 * 기존 record의 action_id를 새 액션으로 교체한다.
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
