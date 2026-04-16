import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '../../store/useUserStore';
import { registerPushToken } from '../../services/notificationService';
import { Colors, Fonts } from '../../constants/theme';

export default function SplashScreen() {
  const loadUser = useUserStore((state) => state.loadUser);

  useEffect(() => {
    const init = async () => {
      // 1. 유저 정보 로드
      await loadUser();

      // 2. 온보딩 완료 유저라면 push token 등록 (실패해도 계속 진행)
      const { user, isOnboardingComplete } = useUserStore.getState();
      if (isOnboardingComplete && user?.user_id) {
        await registerPushToken(user.user_id);
      }

      // 3. isOnboardingComplete에 따라 RootNavigator가 자동 분기
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
