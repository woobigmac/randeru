import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from './firebase';
import app from './firebase';
import { queueNotificationInTransaction, sendNotificationPush } from './inAppNotificationService';
import { Action, DailyRecord, Friend, FriendActionShare, User } from '../types';

const DEFAULT_FUNCTIONS_REGION = 'asia-northeast3';
const functionsRegion =
  process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION || DEFAULT_FUNCTIONS_REGION;
const functions = getFunctions(app, functionsRegion);

export interface FriendActionRecordEntry {
  record_id: string;
  user_id: string;
  nickname: string;
  profileImage?: string | null;
  is_me: boolean;
  status?: string | null;
  source?: string | null;
  memo?: string | null;
  media_url?: string | null;
  photo_url?: string | null;
  media_type?: 'photo' | 'video' | null;
  thumbnail_url?: string | null;
  completed_at?: string | null;
}

const getTodayDate = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
};

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function mapFriendActionShare(id: string, data: Record<string, unknown>): FriendActionShare {
  return {
    share_id: id,
    sender_id: String(data.sender_id ?? ''),
    sender_nickname: String(data.sender_nickname ?? '랜데루 친구'),
    sender_profile_image: optionalString(data.sender_profile_image),
    recipient_id: String(data.recipient_id ?? ''),
    recipient_nickname: String(data.recipient_nickname ?? ''),
    action_id: String(data.action_id ?? ''),
    action_title: String(data.action_title ?? ''),
    action_description: String(data.action_description ?? ''),
    status: (data.status as FriendActionShare['status']) ?? 'sent',
    sender_record_id: optionalString(data.sender_record_id),
    record_id: optionalString(data.record_id),
    created_at: toDate(data.created_at),
    started_at: toDate(data.started_at),
    completed_at: toDate(data.completed_at),
  };
}

export async function shareActionWithFriend(
  sender: User,
  friend: Friend,
  action: Action,
  senderRecordId?: string,
): Promise<FriendActionShare> {
  const shareRef = doc(collection(db, 'friend_action_shares'));
  let notificationId: string | null = null;
  const shareData = {
    sender_id: sender.user_id,
    sender_nickname: sender.nickname,
    sender_profile_image: sender.profileImage ?? null,
    recipient_id: friend.friend_user_id,
    recipient_nickname: friend.nickname,
    action_id: action.action_id,
    action_title: action.title,
    action_description: action.description,
    status: 'sent',
    sender_record_id: senderRecordId ?? null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  await runTransaction(db, async (transaction) => {
    const senderRecordRef = senderRecordId ? doc(db, 'records', senderRecordId) : null;
    const senderRecordSnap = senderRecordRef ? await transaction.get(senderRecordRef) : null;
    const senderRecordData = senderRecordSnap?.exists()
      ? (senderRecordSnap.data() as Partial<DailyRecord>)
      : {};

    transaction.set(shareRef, shareData);
    if (senderRecordRef) {
      transaction.set(senderRecordRef, {
        friend_participants: upsertParticipant(
          senderRecordData.friend_participants,
          {
            user_id: friend.friend_user_id,
            nickname: friend.nickname,
            profileImage: friend.profileImage,
            status: 'joined',
          },
        ),
        updated_at: serverTimestamp(),
      }, { merge: true });
    }

    notificationId = queueNotificationInTransaction(transaction, friend.friend_user_id, {
      type: 'friend_action_shared',
      title: '친구가 액션을 보냈어요',
      body: `${sender.nickname}님이 "${action.title}" 액션을 함께하자고 보냈어요.`,
      related_user_id: sender.user_id,
      related_user_nickname: sender.nickname,
      action_id: action.action_id,
      action_title: action.title,
      friend_action_share_id: shareRef.id,
    });
  });

  if (notificationId) {
    sendNotificationPush(friend.friend_user_id, notificationId).catch((error) => {
      console.warn('sendNotificationPush friend_action_shared error:', error);
    });
  }

  return {
    share_id: shareRef.id,
    sender_id: sender.user_id,
    sender_nickname: sender.nickname,
    sender_profile_image: sender.profileImage,
    recipient_id: friend.friend_user_id,
    recipient_nickname: friend.nickname,
    action_id: action.action_id,
    action_title: action.title,
    action_description: action.description,
    status: 'sent',
    sender_record_id: senderRecordId,
  };
}

export async function getSentActionShares(userId: string): Promise<FriendActionShare[]> {
  const sharesQuery = query(
    collection(db, 'friend_action_shares'),
    where('sender_id', '==', userId),
  );
  const snapshot = await getDocs(sharesQuery);
  return snapshot.docs
    .map((shareDoc) => mapFriendActionShare(shareDoc.id, shareDoc.data()))
    .filter((share) => share.status !== 'cancelled')
    .sort((a, b) => (b.created_at?.getTime() ?? 0) - (a.created_at?.getTime() ?? 0));
}

export async function getReceivedActionShares(userId: string): Promise<FriendActionShare[]> {
  const sharesQuery = query(
    collection(db, 'friend_action_shares'),
    where('recipient_id', '==', userId),
  );
  const snapshot = await getDocs(sharesQuery);
  return snapshot.docs
    .map((shareDoc) => mapFriendActionShare(shareDoc.id, shareDoc.data()))
    .filter((share) => share.status === 'sent' || share.status === 'opened' || share.status === 'started')
    .sort((a, b) => (b.created_at?.getTime() ?? 0) - (a.created_at?.getTime() ?? 0));
}

export async function startReceivedActionShare(
  share: FriendActionShare,
  user: User,
): Promise<DailyRecord> {
  const recordRef = doc(collection(db, 'records'));
  const shareRef = doc(db, 'friend_action_shares', share.share_id);
  const today = getTodayDate();
  const acceptedAt = new Date();
  let notificationId: string | null = null;

  const record = await runTransaction(db, async (transaction) => {
    const shareSnap = await transaction.get(shareRef);
    if (!shareSnap.exists()) {
      throw new Error('공유받은 액션을 찾지 못했어요.');
    }

    const latestShare = mapFriendActionShare(shareSnap.id, shareSnap.data());
    if (latestShare.recipient_id !== user.user_id) {
      throw new Error('내게 공유된 액션만 시작할 수 있어요.');
    }
    if (latestShare.status === 'started' && latestShare.record_id) {
      throw new Error('이미 시작한 액션이에요.');
    }

    const senderRecordRef = latestShare.sender_record_id
      ? doc(db, 'records', latestShare.sender_record_id)
      : null;
    const senderRecordSnap = senderRecordRef ? await transaction.get(senderRecordRef) : null;
    const senderRecordData = senderRecordSnap?.exists()
      ? (senderRecordSnap.data() as Partial<DailyRecord>)
      : {};

    const payload = {
      user_id: user.user_id,
      action_id: latestShare.action_id,
      action_date: today,
      source: 'friend_share' as const,
      status: 'accepted' as const,
      photo_uploaded: false,
      reshuffle_count: 0,
      free_reshuffle_used: false,
      ad_reshuffle_count: 0,
      friend_action_share_id: latestShare.share_id,
      friend_participants: [
        {
          user_id: latestShare.sender_id,
          nickname: latestShare.sender_nickname,
          profileImage: latestShare.sender_profile_image ?? null,
          status: 'in_progress',
        },
      ],
      accepted_at: Timestamp.fromDate(acceptedAt),
    };

    transaction.set(recordRef, payload);
    transaction.update(shareRef, {
      status: 'started',
      record_id: recordRef.id,
      started_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    if (senderRecordRef) {
      transaction.set(senderRecordRef, {
        friend_participants: upsertParticipant(
          senderRecordData.friend_participants,
          {
            user_id: user.user_id,
            nickname: user.nickname,
            profileImage: user.profileImage,
            status: 'in_progress',
          },
        ),
        updated_at: serverTimestamp(),
      }, { merge: true });
    }

    notificationId = queueNotificationInTransaction(transaction, latestShare.sender_id, {
      type: 'friend_action_started',
      title: '친구가 액션을 시작했어요',
      body: `${user.nickname}님이 "${latestShare.action_title}" 액션을 시작했어요.`,
      related_user_id: user.user_id,
      related_user_nickname: user.nickname,
      action_id: latestShare.action_id,
      action_title: latestShare.action_title,
      friend_action_share_id: latestShare.share_id,
    });

    return {
      record_id: recordRef.id,
      ...payload,
      accepted_at: acceptedAt,
      friend_participants: payload.friend_participants.map((participant) => ({
        ...participant,
        profileImage: participant.profileImage ?? null,
      })),
    } as DailyRecord;
  });

  if (notificationId) {
    sendNotificationPush(share.sender_id, notificationId).catch((error) => {
      console.warn('sendNotificationPush friend_action_started error:', error);
    });
  }

  return record;
}

function upsertParticipant(
  participants: DailyRecord['friend_participants'] | undefined,
  nextParticipant: NonNullable<DailyRecord['friend_participants']>[number],
): NonNullable<DailyRecord['friend_participants']> {
  const next = [...(participants ?? [])];
  const index = next.findIndex((participant) => participant.user_id === nextParticipant.user_id);
  if (index >= 0) {
    next[index] = { ...next[index], ...nextParticipant };
  } else {
    next.push(nextParticipant);
  }
  return next.map((participant) => ({
    ...participant,
    profileImage: participant.profileImage ?? null,
  }));
}

export async function completeReceivedActionShare(shareId: string, completedBy: User): Promise<void> {
  const shareRef = doc(db, 'friend_action_shares', shareId);
  let senderId: string | null = null;
  let notificationId: string | null = null;
  await runTransaction(db, async (transaction) => {
    const shareSnap = await transaction.get(shareRef);
    if (!shareSnap.exists()) {
      throw new Error('공유받은 액션을 찾지 못했어요.');
    }

    const latestShare = mapFriendActionShare(shareSnap.id, shareSnap.data());
    senderId = latestShare.sender_id;
    if (latestShare.recipient_id !== completedBy.user_id) {
      throw new Error('내게 공유된 액션만 완료할 수 있어요.');
    }

    const senderRecordRef = latestShare.sender_record_id
      ? doc(db, 'records', latestShare.sender_record_id)
      : null;
    const senderRecordSnap = senderRecordRef ? await transaction.get(senderRecordRef) : null;
    const senderRecordData = senderRecordSnap?.exists()
      ? (senderRecordSnap.data() as Partial<DailyRecord>)
      : {};

    transaction.update(shareRef, {
      status: 'completed',
      completed_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    if (senderRecordRef) {
      transaction.set(senderRecordRef, {
        friend_participants: upsertParticipant(
          senderRecordData.friend_participants,
          {
            user_id: completedBy.user_id,
            nickname: completedBy.nickname,
            profileImage: completedBy.profileImage,
            status: 'completed',
            completed_at: new Date(),
          },
        ),
        updated_at: serverTimestamp(),
      }, { merge: true });
    }

    notificationId = queueNotificationInTransaction(transaction, latestShare.sender_id, {
      type: 'friend_action_completed',
      title: '친구가 액션을 완료했어요',
      body: `${completedBy.nickname}님이 "${latestShare.action_title}" 액션을 완료했어요.`,
      related_user_id: completedBy.user_id,
      related_user_nickname: completedBy.nickname,
      action_id: latestShare.action_id,
      action_title: latestShare.action_title,
      friend_action_share_id: latestShare.share_id,
    });
  });

  if (senderId && notificationId) {
    sendNotificationPush(senderId, notificationId).catch((error) => {
      console.warn('sendNotificationPush friend_action_completed error:', error);
    });
  }
}

function mapFriendActionRecordEntry(value: unknown): FriendActionRecordEntry | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const recordId = optionalString(data.record_id);
  const userId = optionalString(data.user_id);
  const nickname = optionalString(data.nickname);
  if (!recordId || !userId || !nickname) return null;

  const mediaType = data.media_type === 'photo' || data.media_type === 'video'
    ? data.media_type
    : null;

  return {
    record_id: recordId,
    user_id: userId,
    nickname,
    profileImage: optionalString(data.profileImage) ?? null,
    is_me: data.is_me === true,
    status: optionalString(data.status) ?? null,
    source: optionalString(data.source) ?? null,
    memo: optionalString(data.memo) ?? null,
    media_url: optionalString(data.media_url) ?? null,
    photo_url: optionalString(data.photo_url) ?? null,
    media_type: mediaType,
    thumbnail_url: optionalString(data.thumbnail_url) ?? null,
    completed_at: optionalString(data.completed_at) ?? null,
  };
}

export async function getFriendActionRecords(
  recordId: string,
): Promise<FriendActionRecordEntry[]> {
  const callable = httpsCallable<
    { recordId: string },
    { records?: unknown }
  >(functions, 'getFriendActionRecords');
  const result = await callable({ recordId });
  const records = Array.isArray(result.data.records) ? result.data.records : [];
  return records
    .map(mapFriendActionRecordEntry)
    .filter((entry): entry is FriendActionRecordEntry => entry !== null);
}
