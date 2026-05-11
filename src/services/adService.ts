import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { ADMOB_REWARDED_AD_UNIT_ID } from '../constants';

const adUnitId = __DEV__
  ? 'ca-app-pub-3940256099942544/1712485313'
  : ADMOB_REWARDED_AD_UNIT_ID;

export function loadRewardedAd(): Promise<RewardedAd> {
  return new Promise((resolve, reject) => {
    const rewarded = RewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    const unsubscribeLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        unsubscribeLoaded();
        unsubscribeError();
        resolve(rewarded);
      },
    );

    const unsubscribeError = rewarded.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        unsubscribeLoaded();
        unsubscribeError();
        reject(error);
      },
    );

    rewarded.load();
  });
}

export async function showRewardedAd(): Promise<boolean> {
  try {
    const rewarded = await loadRewardedAd();

    return new Promise((resolve) => {
      let rewardEarned = false;
      let settled = false;

      const settle = (value: boolean) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        rewardEarned = true;
      });

      rewarded.addAdEventListener(AdEventType.CLOSED, () => {
        settle(rewardEarned);
      });

      rewarded.addAdEventListener(AdEventType.ERROR, (e) => {
        console.warn('showRewardedAd: 광고 표시 중 에러', e);
        settle(false);
      });

      try {
        rewarded.show();
      } catch (e) {
        console.warn('showRewardedAd: show() 실패', e);
        settle(false);
      }
    });
  } catch (e) {
    console.warn('showRewardedAd: 광고 로드 실패, 공유를 계속 진행합니다.', e);
    return false;
  }
}
