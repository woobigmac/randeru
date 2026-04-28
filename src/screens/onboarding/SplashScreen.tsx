import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '../../store/useUserStore';
import {
  registerPushToken,
  scheduleDailyNotification,
} from '../../services/notificationService';
import { logAppOpen } from '../../services/analyticsService';
import { Colors, Fonts } from '../../constants/theme';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function SplashScreen() {
  const loadUser = useUserStore((state) => state.loadUser);

  useEffect(() => {
    const init = async () => {
      await Promise.all([loadUser(), delay(2500)]);
      logAppOpen();

      const { user, isOnboardingComplete } = useUserStore.getState();
      if (isOnboardingComplete && user?.user_id) {
        registerPushToken(user.user_id).catch(() => {});

        // push 알림 활성화 상태면 앱 시작 시 재등록
        if (user.push_enabled && user.push_time) {
          scheduleDailyNotification(user.push_time).catch(() => {});
        }
      }
    };

    init();
  }, []);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.inner}>
        <Text style={styles.title}>랜데루</Text>
        <Text style={styles.slogan}>하루에 하나, 인간다운 액션</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.handwriting,
    fontSize: 48,
    color: Colors.white,
    marginBottom: 16,
  },
  slogan: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.5,
  },
});
