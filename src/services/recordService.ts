import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Record } from '../types';

export async function createRecord(data: Omit<Record, 'record_id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'records'), {
    ...data,
    accepted_at: serverTimestamp(),
  });
  return ref.id;
}

export async function updateRecord(recordId: string, data: Partial<Record>): Promise<void> {
  const ref = doc(db, 'records', recordId);
  await updateDoc(ref, data as Record<string, unknown>);
}

export async function getRecordsByUser(userId: string): Promise<Record[]> {
  const ref = collection(db, 'records');
  const q = query(ref, where('user_id', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ record_id: d.id, ...d.data() } as Record));
}
