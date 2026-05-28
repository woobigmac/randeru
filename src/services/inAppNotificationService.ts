import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  type Transaction,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from './firebase';
import app from './firebase';
import { InAppNotification, InAppNotificationType } from '../types';

const DEFAULT_FUNCTIONS_REGION = 'asia-northeast3';
const functionsRegion =
  process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION || DEFAULT_FUNCTIONS_REGION;
const functions = getFunctions(app, functionsRegion);

type NotificationPayload = {
  type: InAppNotificationType;
  title: string;
  body: string;
  related_user_id?: string;
  related_user_nickname?: string;
  action_id?: string;
  action_title?: string;
  friend_action_share_id?: string;
};

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function mapNotification(
  id: string,
  data: Record<string, unknown>,
): InAppNotification {
  return {
    notification_id: id,
    user_id: String(data.user_id ?? ''),
    type: data.type as InAppNotificationType,
    title: String(data.title ?? ''),
    body: String(data.body ?? ''),
    is_read: data.is_read === true,
    related_user_id: optionalString(data.related_user_id),
    related_user_nickname: optionalString(data.related_user_nickname),
    action_id: optionalString(data.action_id),
    action_title: optionalString(data.action_title),
    friend_action_share_id: optionalString(data.friend_action_share_id),
    created_at: toDate(data.created_at),
    read_at: toDate(data.read_at),
  };
}

export function queueNotificationInTransaction(
  transaction: Transaction,
  userId: string,
  payload: NotificationPayload,
): string {
  const notificationRef = doc(collection(db, 'users', userId, 'notifications'));
  transaction.set(notificationRef, {
    user_id: userId,
    ...payload,
    is_read: false,
    created_at: serverTimestamp(),
  });
  return notificationRef.id;
}

export async function sendNotificationPush(
  userId: string,
  notificationId: string,
): Promise<void> {
  const callable = httpsCallable<
    { userId: string; notificationId: string },
    { sent?: boolean; reason?: string }
  >(functions, 'sendNotificationPush');
  await callable({ userId, notificationId });
}

export async function getUserNotifications(userId: string): Promise<InAppNotification[]> {
  const notificationsQuery = query(
    collection(db, 'users', userId, 'notifications'),
    orderBy('created_at', 'desc'),
  );
  const snapshot = await getDocs(notificationsQuery);
  return snapshot.docs.map((notificationDoc) =>
    mapNotification(notificationDoc.id, notificationDoc.data()),
  );
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const unreadQuery = query(
    collection(db, 'users', userId, 'notifications'),
    where('is_read', '==', false),
  );
  const snapshot = await getDocs(unreadQuery);
  return snapshot.size;
}

export async function markNotificationAsRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  await updateDoc(doc(db, 'users', userId, 'notifications', notificationId), {
    is_read: true,
    read_at: serverTimestamp(),
  });
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const notifications = await getUserNotifications(userId);
  await Promise.all(
    notifications
      .filter((notification) => !notification.is_read)
      .map((notification) => markNotificationAsRead(userId, notification.notification_id)),
  );
}
