# Firebase Auth / Rules Migration Plan

## Goal

Ship the friend MVP without weakening user data protection.

The current app stores a local `User` object after Kakao, Apple, or guest login, then reads and writes Firestore directly with `user.user_id`. That is enough for app logic, but not enough for secure Firestore or Storage Rules because `request.auth.uid` is not available.

This migration introduces Firebase Auth and gradually moves cross-user writes to trusted server code, while preserving the current app experience during the transition.

## Current State

- Kakao login uses Kakao SDK and creates user documents like `users/kakao_{kakaoId}`.
- Apple login uses Expo Apple Authentication and creates user documents like `users/apple_{appleId}`.
- Guest login creates a local id like `user_{timestamp}_{random}` and is not persisted to Firestore until later user actions.
- Firestore and Storage are accessed directly from the client.
- Friend features currently perform cross-user writes from the client:
  - accept friend invite
  - write both users' friend subcollections
  - create notifications for other users
  - create and update friend action shares
  - update another user's record participant state

## Security Target

Long term, every user-owned document should be protected by Firebase Auth:

- `users/{userId}` where `userId == request.auth.uid`
- `users/{userId}/friends/{friendId}` readable by owner only
- `users/{userId}/notifications/{notificationId}` readable and writable by owner only, except server-created notifications
- `records/{recordId}` readable and writable by owner only, except server-managed friend participant updates
- `friend_invites/{inviteCode}` created by authenticated users and accepted through trusted server logic
- `friend_action_shares/{shareId}` created and state-mutated through trusted server logic
- Storage paths scoped to authenticated owner:
  - `profiles/{userId}.jpg`
  - `photos/{userId}/{recordId}.jpg`
  - `videos/{userId}/{recordId}.mp4`
  - `thumbnails/{userId}/{recordId}.jpg`

## Migration Principle

Do not flip Firestore Rules to strict mode until the app signs in to Firebase Auth.

The safe sequence is:

1. Add Firebase Auth session support without changing Firestore document ids.
2. Verify existing login flows still work.
3. Add Rules in report-only/local-review form.
4. Move high-risk cross-user writes to Cloud Functions.
5. Tighten Firestore and Storage Rules.
6. Optionally migrate user document ids to Firebase UID later.

## Phase 1: Add Firebase Auth Session

Objective: make `request.auth` available while preserving existing `user.user_id` values.

Recommended approach:

- Apple:
  - Use Firebase Auth Apple provider when possible.
  - Keep existing `users/apple_{appleId}` document for compatibility at first.
  - Store `firebase_uid` on the user document.

- Guest:
  - Use Firebase anonymous auth.
  - Keep local guest `user_id` during transition.
  - Store `firebase_uid` once a Firestore user document exists.

- Kakao:
  - Client-only Kakao SDK does not produce a Firebase Auth session by itself.
  - Recommended: Cloud Function verifies Kakao access token and returns Firebase custom token.
  - Client signs in with custom token.
  - Keep existing `users/kakao_{kakaoId}` document during transition.

Compatibility rule for transition:

- Existing app code continues using `user.user_id`.
- New auth code ensures `firebase_uid` is available.
- Rules remain permissive enough for current production until all login methods have Firebase Auth.

## Phase 2: Add Rules Files To Repo

Objective: make security policy versioned and reviewable.

Add:

- `firebase.json`
- `firestore.rules`
- `storage.rules`

Initial rules should be staged and reviewed before deployment. They should not be deployed blindly if Kakao Firebase Auth is not ready.

## Phase 3: Move Cross-User Writes To Functions

Objective: remove dangerous client-side cross-user writes.

Functions to add:

- `acceptFriendInvite(inviteCode)`
  - verifies current Firebase Auth user
  - validates invite state
  - writes both friendship docs
  - writes both friend subcollection docs
  - writes notifications

- `shareActionWithFriend(friendUserId, actionId, senderRecordId?)`
  - verifies friendship
  - creates `friend_action_shares`
  - updates sender record participants
  - creates recipient notification

- `startReceivedActionShare(shareId)`
  - verifies recipient
  - creates recipient record
  - updates share status
  - updates sender record participants
  - creates sender notification

- `completeReceivedActionShare(shareId)`
  - verifies recipient
  - updates share status
  - updates sender record participants
  - creates sender notification

Client services should become thin wrappers around callable functions.

## Phase 4: Tighten Firestore Rules

Target shape:

- Users can read/update their own `users/{userId}` doc.
- Users can read their own friends and notifications.
- Users can read/write their own records.
- Users can read active actions.
- Users cannot directly write:
  - other users' friend docs
  - other users' notifications
  - other users' records
  - `friendships`
  - `friend_action_shares` state transitions

Any exception must be explicit, narrow, and tested.

## Phase 5: Tighten Storage Rules

Target shape:

- Authenticated users can upload only under their own path.
- Downloads should be restricted to owner unless public sharing is explicitly needed.
- Shared media URLs currently use Firebase download URLs; if records become private, ensure sharing behavior still works.

## Suggested Step Order For This Repo

1. Add Firebase Auth initialization and auth state helpers. (Phase 1A: `src/services/firebaseAuthService.ts`)
2. Add anonymous Firebase sign-in for guest users. (Phase 1B: guest login now stores `firebase_uid` when anonymous auth succeeds, with local fallback)
3. Add Firebase Auth Apple sign-in path while preserving existing user docs. (Phase 1C: Apple login now stores `firebase_uid` when Firebase Apple auth succeeds, with existing Apple login fallback)
4. Design Kakao custom token function and client adapter. (Phase 1D: client now sends Kakao access token to `createKakaoCustomToken`, then signs in with the returned Firebase custom token; existing Kakao login remains the fallback. Server function scaffold added under `functions/`.)
5. Add rules files in repo as draft.
6. Move friend invite acceptance to function.
7. Move friend action share/start/complete to functions.
8. Deploy rules to a staging Firebase project first.
9. Run two-device E2E.
10. Deploy to production.

## Rollback Criteria

Stop and rollback the current phase if any of these happen:

- Existing users cannot log in.
- Existing records disappear from app screens.
- A user cannot complete today's action.
- Media upload fails for existing photo/video flows.
- Friend invite acceptance creates only one side of the friendship.
- Notifications are created for the wrong user.

## QA Checklist

- Kakao existing user login
- Apple existing user login
- Guest login
- Profile edit and profile image upload
- Daily action draw, complete, share
- Friend invite create and accept
- Friend action share, start, complete
- Sender sees sent action status update
- Receiver sees received action
- Notification center unread count and read state
- Records filter: all, solo, friends
- Storage upload: profile, photo, video, thumbnail

## Open Decisions

- Whether to keep `users/kakao_{id}` / `users/apple_{id}` permanently or migrate to `users/{firebaseUid}`.
- Whether guest users may use friend features before account upgrade.
- Whether shared media should remain downloadable via token URL or require authenticated access.
- Whether Cloud Functions will be added in this repo or a separate backend repo.
