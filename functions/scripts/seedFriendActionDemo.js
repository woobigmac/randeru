#!/usr/bin/env node

const crypto = require('node:crypto');
const admin = require('firebase-admin');

const DEFAULT_PROJECT_ID = 'randeru-29e21';
const DEMO_SENDER_MEDIA_URL = 'https://picsum.photos/seed/randeru-sender-action/900/900';
const DEMO_FRIEND_MEDIA_URL = 'https://picsum.photos/seed/randeru-friend-action/900/900';

function parseArgs(argv) {
  const args = { apply: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') {
      args.apply = true;
      continue;
    }
    if (!arg.startsWith('--')) continue;

    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function usage() {
  return [
    'Usage:',
    '  node scripts/seedFriendActionDemo.js --user-id USER_ID --friend-id FRIEND_ID [--friend-nickname NAME] [--action-id ACTION_ID] [--date YYYY-MM-DD] [--apply]',
    '',
    'Options:',
    '  --user-id    The current user who sends/owns the friend action record.',
    '  --friend-id  The friend user who receives and completes the shared action.',
    '  --friend-nickname  Optional display name for a QA friend id.',
    '  --action-id        Optional existing action document id. If omitted, the first active action is used.',
    '  --date             Optional action date. Defaults to today in local time.',
    '  --apply            Actually writes data. Without this flag, the script only prints a dry run.',
  ].join('\n');
}

function requireArg(args, key) {
  const value = args[key];
  if (!value || value === true) {
    throw new Error(`Missing required argument --${key}`);
  }
  return String(value);
}

function toDateString(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function parseDate(value) {
  if (!value) return toDateString();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('--date must use YYYY-MM-DD format');
  }
  return value;
}

function getTimestamp(date, hour, minute) {
  const [year, month, day] = date.split('-').map(Number);
  return admin.firestore.Timestamp.fromDate(new Date(year, month - 1, day, hour, minute, 0));
}

function getHash(parts) {
  return crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 16);
}

function getFriendshipId(userIdA, userIdB) {
  return [userIdA, userIdB].sort().join('__');
}

async function getUser(db, userId, fallbackNickname) {
  const snap = await db.collection('users').doc(userId).get();
  const data = snap.exists ? snap.data() : {};
  return {
    user_id: userId,
    nickname: data.nickname || fallbackNickname,
    profileImage: data.profileImage || null,
  };
}

async function getAction(db, actionId) {
  if (actionId) {
    const snap = await db.collection('actions').doc(actionId).get();
    if (!snap.exists) {
      throw new Error(`Action not found: ${actionId}`);
    }
    return { action_id: snap.id, ...snap.data() };
  }

  const snapshot = await db.collection('actions').where('is_active', '==', true).limit(1).get();
  if (snapshot.empty) {
    throw new Error('No active action found. Pass --action-id with an existing action document id.');
  }

  const doc = snapshot.docs[0];
  return { action_id: doc.id, ...doc.data() };
}

function buildSeed({ user, friend, action, actionDate }) {
  const seedHash = getHash([user.user_id, friend.user_id, action.action_id, actionDate]);
  const shareId = `demo_friend_action_share_${seedHash}`;
  const senderRecordId = `demo_friend_sender_record_${seedHash}`;
  const recipientRecordId = `demo_friend_recipient_record_${seedHash}`;
  const acceptedAt = getTimestamp(actionDate, 10, 0);
  const startedAt = getTimestamp(actionDate, 10, 5);
  const completedAt = getTimestamp(actionDate, 10, 35);
  const updatedAt = completedAt;
  const friendshipId = getFriendshipId(user.user_id, friend.user_id);

  const friendship = {
    friendship_id: friendshipId,
    user_ids: [user.user_id, friend.user_id],
    status: 'active',
    source_invite_id: `demo_invite_${seedHash}`,
    created_at: acceptedAt,
    updated_at: updatedAt,
    seed_tag: 'friend_action_demo',
  };

  const userFriend = {
    friend_user_id: friend.user_id,
    nickname: friend.nickname,
    profileImage: friend.profileImage,
    status: 'active',
    source_invite_id: friendship.source_invite_id,
    created_at: acceptedAt,
    updated_at: updatedAt,
    seed_tag: 'friend_action_demo',
  };

  const friendUser = {
    friend_user_id: user.user_id,
    nickname: user.nickname,
    profileImage: user.profileImage,
    status: 'active',
    source_invite_id: friendship.source_invite_id,
    created_at: acceptedAt,
    updated_at: updatedAt,
    seed_tag: 'friend_action_demo',
  };

  const senderRecord = {
    user_id: user.user_id,
    action_id: action.action_id,
    action_date: actionDate,
    source: 'daily',
    status: 'completed',
    slot_id: 'morning',
    photo_uploaded: true,
    memo: '같이 하니까 작은 행동도 더 오래 기억에 남네요.',
    reshuffle_count: 0,
    free_reshuffle_used: false,
    ad_reshuffle_count: 0,
    accepted_at: acceptedAt,
    completed_at: completedAt,
    media_url: DEMO_SENDER_MEDIA_URL,
    media_type: 'photo',
    thumbnail_url: DEMO_SENDER_MEDIA_URL,
    friend_action_share_id: shareId,
    friend_participants: [
      {
        user_id: friend.user_id,
        nickname: friend.nickname,
        profileImage: friend.profileImage,
        status: 'completed',
        completed_at: completedAt,
      },
    ],
    seed_tag: 'friend_action_demo',
    updated_at: updatedAt,
  };

  const recipientRecord = {
    user_id: friend.user_id,
    action_id: action.action_id,
    action_date: actionDate,
    source: 'friend_share',
    status: 'completed',
    photo_uploaded: true,
    memo: '친구가 보내준 액션 덕분에 오늘 하나 해냈어요.',
    reshuffle_count: 0,
    free_reshuffle_used: false,
    ad_reshuffle_count: 0,
    accepted_at: startedAt,
    completed_at: completedAt,
    photo_url: DEMO_FRIEND_MEDIA_URL,
    media_url: DEMO_FRIEND_MEDIA_URL,
    media_type: 'photo',
    thumbnail_url: DEMO_FRIEND_MEDIA_URL,
    friend_action_share_id: shareId,
    friend_participants: [
      {
        user_id: user.user_id,
        nickname: user.nickname,
        profileImage: user.profileImage,
        status: 'completed',
        completed_at: completedAt,
      },
    ],
    seed_tag: 'friend_action_demo',
    updated_at: updatedAt,
  };

  const share = {
    sender_id: user.user_id,
    sender_nickname: user.nickname,
    sender_profile_image: user.profileImage,
    recipient_id: friend.user_id,
    recipient_nickname: friend.nickname,
    action_id: action.action_id,
    action_title: action.title,
    action_description: action.description,
    status: 'completed',
    sender_record_id: senderRecordId,
    record_id: recipientRecordId,
    created_at: acceptedAt,
    started_at: startedAt,
    completed_at: completedAt,
    updated_at: updatedAt,
    seed_tag: 'friend_action_demo',
  };

  const senderNotificationId = `demo_friend_completed_${seedHash}`;
  const friendNotificationId = `demo_friend_started_${seedHash}`;

  const senderNotification = {
    user_id: user.user_id,
    type: 'friend_action_completed',
    title: '친구가 액션을 완료했어요',
    body: `${friend.nickname}님이 "${action.title}" 액션을 완료했어요.`,
    is_read: false,
    related_user_id: friend.user_id,
    related_user_nickname: friend.nickname,
    action_id: action.action_id,
    action_title: action.title,
    friend_action_share_id: shareId,
    created_at: completedAt,
    seed_tag: 'friend_action_demo',
  };

  const friendNotification = {
    user_id: friend.user_id,
    type: 'friend_action_shared',
    title: '친구가 액션을 보냈어요',
    body: `${user.nickname}님이 "${action.title}" 액션을 함께하자고 보냈어요.`,
    is_read: false,
    related_user_id: user.user_id,
    related_user_nickname: user.nickname,
    action_id: action.action_id,
    action_title: action.title,
    friend_action_share_id: shareId,
    created_at: acceptedAt,
    seed_tag: 'friend_action_demo',
  };

  return {
    docs: [
      [`friendships/${friendshipId}`, friendship],
      [`users/${user.user_id}/friends/${friend.user_id}`, userFriend],
      [`users/${friend.user_id}/friends/${user.user_id}`, friendUser],
      [`records/${senderRecordId}`, senderRecord],
      [`records/${recipientRecordId}`, recipientRecord],
      [`friend_action_shares/${shareId}`, share],
      [`in_app_notifications/${senderNotificationId}`, senderNotification],
      [`in_app_notifications/${friendNotificationId}`, friendNotification],
    ],
    summary: {
      action: `${action.title} (${action.action_id})`,
      actionDate,
      senderRecordId,
      recipientRecordId,
      shareId,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const userId = requireArg(args, 'user-id');
  const friendId = requireArg(args, 'friend-id');
  if (userId === friendId) {
    throw new Error('--user-id and --friend-id must be different');
  }

  const actionDate = parseDate(args.date);
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || DEFAULT_PROJECT_ID;

  admin.initializeApp({ projectId });
  const db = admin.firestore();

  const [user, friend, action] = await Promise.all([
    getUser(db, userId, '랜데루 유저'),
    getUser(db, friendId, args['friend-nickname'] || '랜데루 QA친구'),
    getAction(db, args['action-id']),
  ]);

  const seed = buildSeed({ user, friend, action, actionDate });

  console.log(`[friend-action-demo] project: ${projectId}`);
  console.log(`[friend-action-demo] mode: ${args.apply ? 'apply' : 'dry-run'}`);
  console.log(`[friend-action-demo] action: ${seed.summary.action}`);
  console.log(`[friend-action-demo] actionDate: ${seed.summary.actionDate}`);
  console.log('[friend-action-demo] documents:');
  seed.docs.forEach(([path]) => console.log(`  - ${path}`));

  if (!args.apply) {
    console.log('\nDry run only. Add --apply to write these documents.');
    return;
  }

  const batch = db.batch();
  seed.docs.forEach(([path, data]) => {
    batch.set(db.doc(path), data, { merge: true });
  });
  await batch.commit();

  console.log('\nSeed complete.');
  console.log(`Sender record: records/${seed.summary.senderRecordId}`);
  console.log(`Recipient record: records/${seed.summary.recipientRecordId}`);
  console.log(`Action share: friend_action_shares/${seed.summary.shareId}`);
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  console.error(usage());
  process.exitCode = 1;
});
