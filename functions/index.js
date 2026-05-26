const { setGlobalOptions } = require('firebase-functions/v2');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

const REGION = process.env.FUNCTIONS_REGION || 'asia-northeast3';
const KAKAO_TOKEN_INFO_URL = 'https://kapi.kakao.com/v1/user/access_token_info';

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
