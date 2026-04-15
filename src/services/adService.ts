import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { ADMOB_REWARDED_AD_UNIT_ID } from '../constants';

/**
 * 리워드 광고를 로드하고 준비된 RewardedAd 인스턴스를 반환한다.
 * 로드 실패 시 에러를 throw한다.
 */
export function loadRewardedAd(): Promise<RewardedAd> {
  return new Promise((resolve, reject) => {
    const rewarded = RewardedAd.createForAdRequest(ADMOB_REWARDED_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    });

    const unsubscribeLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        unsubscribeLoaded();
        resolve(rewarded);
      },
    );

    const unsubscribeError = rewarded.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        unsubscribeError();
        reject(error);
      },
    );

    rewarded.load();
  });
}

/**
 * 리워드 광고를 로드하고 시청한다.
 * - 광고 시청 완료(보상 획득) 시 true 반환
 * - 광고 스킵, 로드 실패, 에러 시 false 반환 (앱 크래시 방지)
 * - false를 반환해도 공유는 정상 진행해야 함 (광고는 수익용)
 */
export async function showRewardedAd(): Promise<boolean> {
  try {
    const rewarded = await loadRewardedAd();

    return new Promise((resolve) => {
      let rewardEarned = false;

      rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        rewardEarned = true;
      });

      rewarded.addAdEventListener(AdEventType.CLOSED, () => {
        resolve(rewardEarned);
      });

      rewarded.show();
    });
  } catch (e) {
    // 광고 로드 실패 — 공유는 계속 진행
    console.warn('showRewardedAd: 광고 로드 실패, 공유를 계속 진행합니다.', e);
    return false;
  }
}
