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
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { Action, DailyRecord, DailySlotStatus, SlotId, Tone } from '../types';
import { DAILY_SLOTS } from '../constants';

const FIRESTORE_TIMEOUT_MS = 10000;
const FIRESTORE_TIMEOUT_ERROR = 'firestore_timeout';

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

/** 다음 슬롯이 열렸는지 확인 — 열렸으면 이전 슬롯은 미완료 시 잠금 처리. */
function isSlotExpired(slotId: SlotId): boolean {
  const now = new Date();
  const totalMin = now.getHours() * 60 + now.getMinutes();
  if (slotId === 'morning') return totalMin >= 12 * 60 + 30; // 점심 오픈 시
  if (slotId === 'lunch') return totalMin >= 19 * 60;         // 저녁 오픈 시
  return false;
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
const firestoreTimeout = <T>(promise: Promise<T>, ms = FIRESTORE_TIMEOUT_MS): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(FIRESTORE_TIMEOUT_ERROR)), ms),
    ),
  ]);

export function isFirestoreTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message === FIRESTORE_TIMEOUT_ERROR;
}

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
    ).filter((record) => record.source !== 'friend_share');

    // action 일괄 조회
    const actionIds = [...new Set(todayRecords.map((r) => r.action_id))];
    const actionMap: Record<string, Action> = {};
    await Promise.all(
      actionIds.map(async (id) => {
        const snap = await firestoreTimeout(getDoc(doc(db, 'actions', id)));
        if (snap.exists()) actionMap[id] = { action_id: snap.id, ...snap.data() } as Action;
      }),
    );

    return DAILY_SLOTS.map((slot) => {
      const record =
        todayRecords.find((r) => (r.slot_id ?? 'morning') === slot.id) ?? null;
      const action = record ? (actionMap[record.action_id] ?? null) : null;
      const available = isSlotAvailable(slot.hour, slot.minute);

      const isCompleted = record?.status === 'completed' || record?.status === 'shared';
      const expired = isSlotExpired(slot.id);

      let status: DailySlotStatus['status'];
      if (!available) {
        status = 'locked';
      } else if (expired && !isCompleted) {
        status = 'locked';
      } else if (!record) {
        status = 'available';
      } else if (isCompleted) {
        status = 'completed';
      } else {
        status = 'accepted';
      }

      return { slot_id: slot.id, label: slot.label, time: slot.time, isAvailable: available, record, action, status };
    });
  } catch (e) {
    console.error('getTodaySlots error:', e);
    return DAILY_SLOTS.map((slot) => {
      const available = isSlotAvailable(slot.hour, slot.minute);
      const expired = isSlotExpired(slot.id);
      return {
        slot_id: slot.id,
        label: slot.label,
        time: slot.time,
        isAvailable: available,
        record: null,
        action: null,
        status: (!available || expired) ? 'locked' : 'available',
      };
    });
  }
}

/**
 * Firestore 'actions' 컬렉션에서 액션 1개를 조회한다.
 */
export async function getActionById(actionId: string): Promise<Action | null> {
  try {
    const snap = await firestoreTimeout(getDoc(doc(db, 'actions', actionId)));
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
  slotId?: SlotId,
): Promise<Action | null> {
  try {
    const q = query(
      collection(db, 'actions'),
      where('is_active', '==', true),
    );
    const snapshot = await firestoreTimeout(getDocs(q));
    const candidates = snapshot.docs
      .map((d) => ({ action_id: d.id, ...d.data() } as Action))
      .filter((a) => !excludeIds.includes(a.action_id))
      .filter((a) => isActionAvailableForSlot(a, slotId));
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  } catch (e) {
    console.error('getRandomAction error:', e);
    return null;
  }
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function hasRestriction(values?: Record<string, boolean | undefined>): boolean {
  if (!values) return false;
  return Object.values(values).some((value) => value === false);
}

function isActionAvailableForSlot(action: Action, slotId?: SlotId, date = new Date()): boolean {
  if (!slotId) return true;

  const slotAvailability = action.slot_availability;
  const dayAvailability = action.day_availability;
  const dayKey = isWeekend(date) ? 'weekend' : 'weekday';
  const slotAllowed = slotAvailability?.[slotId] ?? true;
  const dayAllowed = dayAvailability?.[dayKey] ?? true;

  if (action.availability_operator === 'any') {
    const slotRestricted = hasRestriction(slotAvailability);
    const dayRestricted = hasRestriction(dayAvailability);
    if (!slotRestricted && !dayRestricted) return true;
    return (slotRestricted && slotAllowed) || (dayRestricted && dayAllowed);
  }

  return slotAllowed && dayAllowed;
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
    free_reshuffle_used: false,
    ad_reshuffle_count: 0,
    accepted_at: Timestamp.fromDate(now),
  };

  const ref = await firestoreTimeout(addDoc(collection(db, 'records'), payload));
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
  usedAd: boolean,
): Promise<void> {
  try {
    await firestoreTimeout(
      updateDoc(doc(db, 'records', recordId), {
        action_id: newAction.action_id,
        reshuffle_count: reshuffleCount + 1,
        ...(usedAd
          ? { ad_reshuffle_count: increment(1) }
          : { free_reshuffle_used: true }),
      }),
    );
  } catch (e) {
    console.error('reshuffleAction error:', e);
    throw e;
  }
}
