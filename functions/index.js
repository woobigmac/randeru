const { setGlobalOptions } = require('firebase-functions/v2');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

const REGION = process.env.FUNCTIONS_REGION || 'asia-northeast3';
const KAKAO_TOKEN_INFO_URL = 'https://kapi.kakao.com/v1/user/access_token_info';
const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';

admin.initializeApp();
setGlobalOptions({ region: REGION, maxInstances: 10 });

function getExpectedKakaoAppId() {
  const rawAppId = process.env.KAKAO_APP_ID;
  if (!rawAppId) return null;

  const appId = Number(rawAppId);
  if (!Number.isFinite(appId)) {
    throw new HttpsError('failed-precondition', 'KAKAO_APP_ID must be a number.');
  }

  return appId;
}

function assertAccessToken(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'Kakao access token is required.');
  }

  return value.trim();
}

function assertRecordId(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'recordId is required.');
  }

  return value.trim();
}

function assertId(value, name) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpsError('invalid-argument', `${name} is required.`);
  }

  return value.trim();
}

function timestampToIso(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

function isExpoPushToken(value) {
  return (
    typeof value === 'string' &&
    (value.startsWith('ExponentPushToken[') || value.startsWith('ExpoPushToken['))
  );
}

function compactPushString(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function buildPushPayload(token, notificationId, notification) {
  return {
    to: token,
    sound: 'default',
    title: compactPushString(notification.title, '랜데루'),
    body: compactPushString(notification.body, '새 알림이 도착했어요.'),
    data: {
      notification_id: notificationId,
      type: notification.type || 'notification',
      action_id: notification.action_id || null,
      action_title: notification.action_title || null,
      friend_action_share_id: notification.friend_action_share_id || null,
      related_user_id: notification.related_user_id || null,
      related_user_nickname: notification.related_user_nickname || null,
    },
  };
}

async function sendExpoPushMessage(payload) {
  let response;
  try {
    response = await fetch(EXPO_PUSH_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Expo push request failed:', error);
    throw error;
  }

  const body = await response.json().catch(async () => ({
    parse_error_body: await response.text().catch(() => ''),
  }));

  if (!response.ok) {
    console.error('Expo push rejected:', {
      status: response.status,
      body,
    });
    throw new Error(`Expo push rejected with status ${response.status}`);
  }

  return body;
}

async function assertCanSendNotificationPush(db, authUid, notificationUserId, notification) {
  const requesterUserId = assertId(notification.related_user_id, 'related_user_id');
  const requesterSnap = await db.collection('users').doc(requesterUserId).get();
  const requester = requesterSnap.exists ? requesterSnap.data() || {} : {};
  const authMatchesRequester =
    requesterUserId === authUid ||
    requester.firebase_uid === authUid;

  if (!authMatchesRequester) {
    throw new HttpsError('permission-denied', 'You can only send push for your own action.');
  }

  if (notification.user_id !== notificationUserId) {
    throw new HttpsError('permission-denied', 'Notification owner mismatch.');
  }
}

function compactRecord(recordId, data, share, currentUid) {
  const isSender = data.user_id === share.sender_id;
  const nickname = isSender ? share.sender_nickname : share.recipient_nickname;
  const profileImage = isSender ? share.sender_profile_image : null;

  return {
    record_id: recordId,
    user_id: data.user_id,
    nickname: nickname || '랜데루 친구',
    profileImage: profileImage || null,
    is_me: data.user_id === currentUid,
    status: data.status || null,
    source: data.source || null,
    memo: data.memo || null,
    media_url: data.media_url || data.photo_url || null,
    photo_url: data.photo_url || null,
    media_type: data.media_type || null,
    thumbnail_url: data.thumbnail_url || data.media_url || data.photo_url || null,
    completed_at: timestampToIso(data.completed_at),
  };
}

async function verifyKakaoAccessToken(accessToken) {
  let response;
  try {
    response = await fetch(KAKAO_TOKEN_INFO_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (error) {
    console.error('Kakao token verification request failed:', error);
    throw new HttpsError('unavailable', 'Failed to verify Kakao access token.');
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.warn('Kakao token verification rejected:', {
      status: response.status,
      body,
    });
    throw new HttpsError('unauthenticated', 'Kakao access token is invalid.');
  }

  const data = await response.json().catch((error) => {
    console.error('Kakao token verification response parse failed:', error);
    throw new HttpsError('internal', 'Kakao token verification response is invalid.');
  });

  const kakaoId = data && data.id;
  if (typeof kakaoId !== 'number' && typeof kakaoId !== 'string') {
    console.error('Kakao token verification response missing id:', data);
    throw new HttpsError('internal', 'Kakao token verification response is invalid.');
  }

  const expectedAppId = getExpectedKakaoAppId();
  if (expectedAppId !== null && Number(data.app_id) !== expectedAppId) {
    console.warn('Kakao app id mismatch:', {
      expectedAppId,
      actualAppId: data.app_id,
    });
    throw new HttpsError('permission-denied', 'Kakao access token belongs to a different app.');
  }

  return {
    kakaoId: String(kakaoId),
    appId: data.app_id !== undefined ? String(data.app_id) : undefined,
  };
}

exports.createKakaoCustomToken = onCall(async (request) => {
  const accessToken = assertAccessToken(request.data && request.data.accessToken);
  const kakao = await verifyKakaoAccessToken(accessToken);
  const uid = `kakao_${kakao.kakaoId}`;

  const customToken = await admin.auth().createCustomToken(uid, {
    provider: 'kakao',
    kakao_id: kakao.kakaoId,
    ...(kakao.appId && { kakao_app_id: kakao.appId }),
  });

  return {
    customToken,
    uid,
    kakaoId: kakao.kakaoId,
  };
});

exports.getFriendActionRecords = onCall(async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Login is required.');
  }

  const recordId = assertRecordId(request.data && request.data.recordId);
  const currentUid = request.auth.uid;
  const db = admin.firestore();

  const recordSnap = await db.collection('records').doc(recordId).get();
  if (!recordSnap.exists) {
    throw new HttpsError('not-found', 'Record not found.');
  }

  const record = recordSnap.data();
  if (!record || record.user_id !== currentUid) {
    throw new HttpsError('permission-denied', 'You can only read your own friend action records.');
  }

  const shareId = record.friend_action_share_id;
  if (typeof shareId !== 'string' || !shareId) {
    return { records: [] };
  }

  const shareSnap = await db.collection('friend_action_shares').doc(shareId).get();
  if (!shareSnap.exists) {
    return { records: [] };
  }

  const share = shareSnap.data();
  if (!share || (share.sender_id !== currentUid && share.recipient_id !== currentUid)) {
    throw new HttpsError('permission-denied', 'This friend action is not yours.');
  }

  const recordsSnap = await db
    .collection('records')
    .where('friend_action_share_id', '==', shareId)
    .get();

  const records = recordsSnap.docs
    .map((docSnap) => compactRecord(docSnap.id, docSnap.data(), share, currentUid))
    .filter((item) => item.status === 'completed' || item.status === 'shared')
    .sort((a, b) => {
      if (a.is_me !== b.is_me) return a.is_me ? -1 : 1;
      return (a.completed_at || '').localeCompare(b.completed_at || '');
    });

  return { records };
});

exports.sendNotificationPush = onCall(async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Login is required.');
  }

  const data = request.data || {};
  const userId = assertId(data.userId, 'userId');
  const notificationId = assertId(data.notificationId, 'notificationId');
  const db = admin.firestore();
  const userRef = db.collection('users').doc(userId);
  const notificationRef = userRef.collection('notifications').doc(notificationId);
  const [userSnap, notificationSnap] = await Promise.all([
    userRef.get(),
    notificationRef.get(),
  ]);

  if (!userSnap.exists) {
    throw new HttpsError('not-found', 'User not found.');
  }
  if (!notificationSnap.exists) {
    throw new HttpsError('not-found', 'Notification not found.');
  }

  const notification = notificationSnap.data() || {};
  await assertCanSendNotificationPush(db, request.auth.uid, userId, notification);

  if (notification.push_sent_at) {
    return { sent: false, reason: 'already_sent' };
  }

  const user = userSnap.data() || {};
  if (user.push_enabled === false) {
    console.info('Push skipped because push is disabled:', { userId, notificationId });
    await notificationRef.set({
      push_skipped_at: admin.firestore.FieldValue.serverTimestamp(),
      push_skip_reason: 'disabled',
    }, { merge: true });
    return { sent: false, reason: 'disabled' };
  }

  const pushToken = user.push_token;
  if (!isExpoPushToken(pushToken)) {
    console.info('Push skipped because Expo push token is missing or invalid:', {
      userId,
      notificationId,
    });
    await notificationRef.set({
      push_skipped_at: admin.firestore.FieldValue.serverTimestamp(),
      push_skip_reason: 'missing_token',
    }, { merge: true });
    return { sent: false, reason: 'missing_token' };
  }

  const payload = buildPushPayload(pushToken, notificationId, notification);
  const result = await sendExpoPushMessage(payload);
  const ticket = Array.isArray(result.data) ? result.data[0] : result.data;

  if (ticket && ticket.status === 'error') {
    console.warn('Expo push ticket error:', {
      userId,
      notificationId,
      details: ticket.details || null,
      message: ticket.message || null,
    });

    if (ticket.details && ticket.details.error === 'DeviceNotRegistered') {
      await userRef.set({
        push_token: admin.firestore.FieldValue.delete(),
      }, { merge: true });
    }

    await notificationRef.set({
      push_failed_at: admin.firestore.FieldValue.serverTimestamp(),
      push_error: ticket.message || 'Expo push failed.',
      push_error_code: ticket.details && ticket.details.error ? ticket.details.error : null,
    }, { merge: true });

    return {
      sent: false,
      reason: ticket.details && ticket.details.error ? ticket.details.error : 'expo_error',
    };
  }

  await notificationRef.set({
    push_sent_at: admin.firestore.FieldValue.serverTimestamp(),
    push_ticket_id: ticket && ticket.id ? ticket.id : null,
  }, { merge: true });

  console.info('Expo push sent:', {
    userId,
    notificationId,
    ticketId: ticket && ticket.id ? ticket.id : null,
  });

  return { sent: true };
});
