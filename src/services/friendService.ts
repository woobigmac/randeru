import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { queueNotificationInTransaction } from './inAppNotificationService';
import { Friend, FriendInvite, User } from '../types';

const INVITE_EXPIRE_DAYS = 14;
const TOKEN_LENGTH = 8;

export type FriendInviteErrorCode =
  | 'invite_not_found'
  | 'invite_expired'
  | 'invite_already_used'
  | 'self_invite'
  | 'already_friends';

export class FriendInviteError extends Error {
  code: FriendInviteErrorCode;

  constructor(code: FriendInviteErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < TOKEN_LENGTH; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function normalizeInviteCode(inviteCode: string): string {
  return inviteCode.trim().replace(/\s/g, '').toUpperCase();
}

function getFriendshipId(userIdA: string, userIdB: string): string {
  return [userIdA, userIdB].sort().join('__');
}

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return undefined;
}

function isExpired(expiresAt: unknown): boolean {
  const expiresAtDate = toDate(expiresAt);
  return !!expiresAtDate && expiresAtDate.getTime() < Date.now();
}

function getInviteExpiresAt(): Timestamp {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRE_DAYS);
  return Timestamp.fromDate(expiresAt);
}

function mapInvite(id: string, data: Record<string, unknown>): FriendInvite {
  return {
    invite_id: id,
    invite_code: String(data.invite_code ?? id),
    inviter_id: String(data.inviter_id ?? ''),
    inviter_nickname: String(data.inviter_nickname ?? ''),
    inviter_profile_image:
      typeof data.inviter_profile_image === 'string' ? data.inviter_profile_image : undefined,
    status: (data.status as FriendInvite['status']) ?? 'pending',
    accepted_by: data.accepted_by as string | undefined,
    accepted_by_nickname: data.accepted_by_nickname as string | undefined,
    created_at: toDate(data.created_at),
    expires_at: toDate(data.expires_at),
    accepted_at: toDate(data.accepted_at),
  };
}

function mapFriend(data: Record<string, unknown>): Friend {
  return {
    friend_user_id: String(data.friend_user_id ?? ''),
    nickname: String(data.nickname ?? '랜데루 친구'),
    profileImage: typeof data.profileImage === 'string' ? data.profileImage : undefined,
    status: (data.status as Friend['status']) ?? 'active',
    source_invite_id: data.source_invite_id as string | undefined,
    created_at: toDate(data.created_at),
  };
}

export function getInviteLink(inviteCode: string): string {
  return `randeru://invite/${normalizeInviteCode(inviteCode)}`;
}

export function getInviteShareMessage(invite: FriendInvite): string {
  return [
    '하루에 하나, 인간다운 액션🪻',
    `${invite.inviter_nickname}님이 랜데루로 초대했어요.`,
    '친구와 함께 인간다운 액션을 함께 시작하고 기록으로 남겨봐요',
    '',
    `초대 코드: ${invite.invite_code}`,
    `초대 링크: ${getInviteLink(invite.invite_code)}`,
  ].join('\n');
}

export async function createFriendInvite(user: User): Promise<FriendInvite> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = generateInviteCode();
    const inviteRef = doc(db, 'friend_invites', inviteCode);
    const inviteSnap = await getDoc(inviteRef);
    if (inviteSnap.exists()) continue;

    const inviteData = {
      invite_code: inviteCode,
      inviter_id: user.user_id,
      inviter_nickname: user.nickname,
      inviter_profile_image: user.profileImage ?? null,
      status: 'pending',
      created_at: serverTimestamp(),
      expires_at: getInviteExpiresAt(),
    };

    await setDoc(inviteRef, inviteData);
    return {
      invite_id: inviteCode,
      invite_code: inviteCode,
      inviter_id: user.user_id,
      inviter_nickname: user.nickname,
      inviter_profile_image: user.profileImage,
      status: 'pending',
      expires_at: getInviteExpiresAt().toDate(),
    };
  }

  throw new Error('초대 코드를 만들지 못했어요. 잠시 후 다시 시도해주세요.');
}

export async function acceptFriendInvite(inviteCodeInput: string, invitee: User): Promise<Friend> {
  const inviteCode = normalizeInviteCode(inviteCodeInput);
  if (!inviteCode) {
    throw new FriendInviteError('invite_not_found', '초대 코드를 입력해주세요.');
  }

  const acceptedFriend = await runTransaction(db, async (transaction) => {
    const inviteRef = doc(db, 'friend_invites', inviteCode);
    const inviteSnap = await transaction.get(inviteRef);

    if (!inviteSnap.exists()) {
      throw new FriendInviteError('invite_not_found', '존재하지 않는 초대 코드예요.');
    }

    const invite = mapInvite(inviteSnap.id, inviteSnap.data());
    if (invite.inviter_id === invitee.user_id) {
      throw new FriendInviteError('self_invite', '내가 만든 초대 코드는 사용할 수 없어요.');
    }

    if (invite.status === 'accepted') {
      throw new FriendInviteError('invite_already_used', '이미 사용된 초대 코드예요.');
    }

    if (isExpired(invite.expires_at)) {
      transaction.update(inviteRef, { status: 'expired' });
      throw new FriendInviteError('invite_expired', '만료된 초대 코드예요.');
    }

    const friendshipId = getFriendshipId(invite.inviter_id, invitee.user_id);
    const friendshipRef = doc(db, 'friendships', friendshipId);
    const friendshipSnap = await transaction.get(friendshipRef);
    if (friendshipSnap.exists()) {
      throw new FriendInviteError('already_friends', '이미 친구로 등록되어 있어요.');
    }

    const inviterRef = doc(db, 'users', invite.inviter_id);
    const inviterSnap = await transaction.get(inviterRef);
    const inviterUser = inviterSnap.exists()
      ? ({ user_id: inviterSnap.id, ...inviterSnap.data() } as User)
      : ({
          user_id: invite.inviter_id,
          nickname: invite.inviter_nickname,
          profileImage: invite.inviter_profile_image,
        } as User);

    const now = serverTimestamp();
    transaction.set(friendshipRef, {
      friendship_id: friendshipId,
      user_ids: [invite.inviter_id, invitee.user_id],
      status: 'active',
      source_invite_id: invite.invite_id,
      created_at: now,
      updated_at: now,
    });

    transaction.set(doc(db, 'users', invite.inviter_id, 'friends', invitee.user_id), {
      friend_user_id: invitee.user_id,
      nickname: invitee.nickname,
      profileImage: invitee.profileImage ?? null,
      status: 'active',
      source_invite_id: invite.invite_id,
      created_at: now,
      updated_at: now,
    });

    const friendForInvitee: Friend = {
      friend_user_id: inviterUser.user_id,
      nickname: inviterUser.nickname,
      profileImage: inviterUser.profileImage,
      status: 'active',
      source_invite_id: invite.invite_id,
    };

    transaction.set(doc(db, 'users', invitee.user_id, 'friends', invite.inviter_id), {
      ...friendForInvitee,
      profileImage: friendForInvitee.profileImage ?? null,
      created_at: now,
      updated_at: now,
    });

    transaction.update(inviteRef, {
      status: 'accepted',
      accepted_by: invitee.user_id,
      accepted_by_nickname: invitee.nickname,
      accepted_at: now,
    });

    queueNotificationInTransaction(transaction, invite.inviter_id, {
      type: 'friend_invite_accepted',
      title: '친구 등록 완료',
      body: `${invitee.nickname}님이 초대를 수락했어요.`,
      related_user_id: invitee.user_id,
      related_user_nickname: invitee.nickname,
    });

    queueNotificationInTransaction(transaction, invitee.user_id, {
      type: 'friend_invite_accepted',
      title: '친구 등록 완료',
      body: `${inviterUser.nickname}님과 친구가 되었어요.`,
      related_user_id: inviterUser.user_id,
      related_user_nickname: inviterUser.nickname,
    });

    return friendForInvitee;
  });

  return acceptedFriend;
}

export async function getFriends(userId: string): Promise<Friend[]> {
  const friendsQuery = query(
    collection(db, 'users', userId, 'friends'),
    orderBy('created_at', 'desc'),
  );
  const snapshot = await getDocs(friendsQuery);
  return snapshot.docs
    .map((friendDoc) => mapFriend(friendDoc.data()))
    .filter((friend) => friend.status === 'active');
}

export async function getSentFriendInvites(userId: string): Promise<FriendInvite[]> {
  const invitesQuery = query(
    collection(db, 'friend_invites'),
    where('inviter_id', '==', userId),
  );
  const snapshot = await getDocs(invitesQuery);
  return snapshot.docs
    .map((inviteDoc) => mapInvite(inviteDoc.id, inviteDoc.data()))
    .sort((a, b) => (b.created_at?.getTime() ?? 0) - (a.created_at?.getTime() ?? 0));
}
