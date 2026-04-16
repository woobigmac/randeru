import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { Action, DailyRecord } from '../types';

export async function createRecord(data: Omit<DailyRecord, 'record_id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'records'), {
    ...data,
    accepted_at: serverTimestamp(),
  });
  return ref.id;
}

export async function updateRecord(
  recordId: string,
  data: Partial<DailyRecord>,
): Promise<void> {
  const ref = doc(db, 'records', recordId);
  await updateDoc(ref, data as { [key: string]: unknown });
}

export async function getRecordsByUser(userId: string): Promise<DailyRecord[]> {
  const ref = collection(db, 'records');
  const q = query(ref, where('user_id', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ record_id: d.id, ...d.data() } as DailyRecord));
}

/**
 * 해당 유저의 완료/공유된 전체 기록을 action_date 내림차순으로 반환한다.
 */
export async function getUserRecords(userId: string): Promise<DailyRecord[]> {
  try {
    const q = query(
      collection(db, 'records'),
      where('user_id', '==', userId),
      where('status', 'in', ['completed', 'shared']),
    );
    const snapshot = await getDocs(q);
    const records = snapshot.docs.map((d) => ({ record_id: d.id, ...d.data() } as DailyRecord));
    return records.sort((a, b) => b.action_date.localeCompare(a.action_date));
  } catch (e) {
    console.error('getUserRecords error:', e);
    return [];
  }
}

/**
 * record의 action_id로 액션 정보를 조회해 함께 반환한다.
 */
export async function getRecordWithAction(
  record: DailyRecord,
): Promise<{ record: DailyRecord; action: Action }> {
  const snap = await getDoc(doc(db, 'actions', record.action_id));
  if (!snap.exists()) throw new Error(`Action not found: ${record.action_id}`);
  const action = { action_id: snap.id, ...snap.data() } as Action;
  return { record, action };
}

const toDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * 누적 완료 수와 오늘부터 역순 연속 수행일을 반환한다.
 */
export async function getUserStats(
  userId: string,
): Promise<{ totalCount: number; streakDays: number }> {
  try {
    const q = query(
      collection(db, 'records'),
      where('user_id', '==', userId),
      where('status', 'in', ['completed', 'shared']),
    );
    const snapshot = await getDocs(q);
    const totalCount = snapshot.size;

    const dateSet = new Set(snapshot.docs.map((d) => (d.data() as DailyRecord).action_date));
    let streakDays = 0;
    const today = new Date();
    for (let i = 0; ; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (!dateSet.has(toDateStr(d))) break;
      streakDays++;
    }

    return { totalCount, streakDays };
  } catch (e) {
    console.error('getUserStats error:', e);
    return { totalCount: 0, streakDays: 0 };
  }
}

/**
 * 사진 또는 영상을 Firebase Storage에 업로드하고 URL을 반환한다.
 * - 사진: photos/{userId}/{recordId}.jpg
 * - 영상: videos/{userId}/{recordId}.mp4  (thumbnailUrl은 추후 별도 생성)
 */
export async function uploadMedia(
  userId: string,
  recordId: string,
  uri: string,
  mediaType: 'photo' | 'video',
): Promise<{ url: string; thumbnailUrl: string }> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const path =
    mediaType === 'photo'
      ? `photos/${userId}/${recordId}.jpg`
      : `videos/${userId}/${recordId}.mp4`;
  const metadata = { contentType: mediaType === 'photo' ? 'image/jpeg' : 'video/mp4' };
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, metadata);
  const url = await getDownloadURL(storageRef);
  return { url, thumbnailUrl: url };
}

/**
 * record를 'shared' 상태로 업데이트한다.
 */
export async function markAsShared(
  recordId: string,
  shareChannel: string,
): Promise<void> {
  const ref = doc(db, 'records', recordId);
  await updateDoc(ref, {
    status: 'shared',
    share_channel: shareChannel,
    shared_at: Timestamp.fromDate(new Date()),
  });
}
