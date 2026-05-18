import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useUserStore } from '../../store/useUserStore';
import {
  hasNotificationPermission,
  registerPushToken,
  scheduleDailySlotNotifications,
} from '../../services/notificationService';
import { logAppOpen } from '../../services/analyticsService';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const splashImage = require('../../../assets/splash.png');

export default function SplashScreen() {
  const loadUser = useUserStore((state) => state.loadUser);

  useEffect(() => {
    const init = async () => {
      await Promise.all([loadUser(), delay(4000)]);
      logAppOpen();

      const { user, isOnboardingComplete } = useUserStore.getState();
      if (isOnboardingComplete && user?.user_id) {
        registerPushToken(user.user_id).catch(() => {});

        // push 알림 활성화 상태면 슬롯별 알림 재등록
        if (user.push_enabled) {
          hasNotificationPermission()
            .then((granted) => {
              if (granted) scheduleDailySlotNotifications(user.push_slots).catch(() => {});
            })
            .catch(() => {});
        }
      }
    };

    init();
  }, []);

  return (
    <View style={styles.container}>
      <Image source={splashImage} style={styles.image} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
