import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { Action, Tone } from '../types';

export async function getActionById(actionId: string): Promise<Action | null> {
  const ref = doc(db, 'actions', actionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { action_id: snap.id, ...snap.data() } as Action;
}

export async function getActionsByTones(tones: Tone[]): Promise<Action[]> {
  const ref = collection(db, 'actions');
  const q = query(ref, where('category', 'in', tones), where('is_active', '==', true));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ action_id: d.id, ...d.data() } as Action));
}
