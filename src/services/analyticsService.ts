import analytics from '@react-native-firebase/analytics';

/**
 * 모든 analytics 호출을 try-catch로 감싸 앱 크래시를 방지합니다.
 */
async function safe(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    console.warn('[Analytics] 이벤트 전송 실패:', e);
  }
}

/** 앱 실행 시 */
export const logAppOpen = (): void => {
  void safe(() => analytics().logAppOpen());
};

/** 오늘의 액션 배정 시 */
export const logActionReceived = (actionId: string, category: string): void => {
  void safe(() =>
    analytics().logEvent('action_received', {
      action_id: actionId,
      category,
    }),
  );
};

/** 액션 수락(배정 확인) 시 */
export const logActionAccepted = (actionId: string, category: string): void => {
  void safe(() =>
    analytics().logEvent('action_accepted', {
      action_id: actionId,
      category,
    }),
  );
};

/** 액션 완료(사진/영상 저장) 시 */
export const logActionCompleted = (
  actionId: string,
  category: string,
  hasMedia: boolean,
): void => {
  void safe(() =>
    analytics().logEvent('action_completed', {
      action_id: actionId,
      category,
      has_media: hasMedia,
    }),
  );
};

/** 공유 완료 시 */
export const logActionShared = (actionId: string, shareChannel: string): void => {
  void safe(() =>
    analytics().logEvent('action_shared', {
      action_id: actionId,
      share_channel: shareChannel,
    }),
  );
};

/** 재추첨 시 */
export const logReshuffle = (reshuffleCount: number, usedAd: boolean): void => {
  void safe(() =>
    analytics().logEvent('reshuffle', {
      reshuffle_count: reshuffleCount,
      used_ad: usedAd,
    }),
  );
};

/** 로그인 시 */
export const logLogin = (loginType: 'kakao' | 'guest'): void => {
  void safe(() => analytics().logLogin({ method: loginType }));
};

/** 온보딩 완료 시 */
export const logOnboardingComplete = (age: number, tones: string[]): void => {
  void safe(() =>
    analytics().logEvent('onboarding_complete', {
      age,
      tones: tones.join(','),
    }),
  );
};

/** 푸시 알림 수신 시 */
export const logPushNotificationReceived = (): void => {
  void safe(() => analytics().logEvent('push_notification_received'));
};
