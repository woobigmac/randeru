# Randeru Cloud Functions

## createKakaoCustomToken

Callable function used by the mobile app to exchange a Kakao access token for a Firebase custom token.

Flow:

1. Client signs in with Kakao SDK.
2. Client sends the Kakao access token to `createKakaoCustomToken`.
3. Function verifies the token with Kakao.
4. Function creates a Firebase custom token using `kakao_{kakaoId}` as the Firebase UID.
5. Client signs in to Firebase Auth with the returned custom token.

## Environment

Optional:

- `FUNCTIONS_REGION`: Firebase Functions region. Defaults to `asia-northeast3`.
- `KAKAO_APP_ID`: Numeric Kakao app id. When set, the function rejects tokens from other Kakao apps.

The Expo app should use the same region via:

- `EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION=asia-northeast3`

## Local Checks

```bash
npm run check
```

## Deploy

```bash
npm install
npm run deploy
```
