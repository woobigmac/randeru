import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useUserStore } from '../../store/useUserStore';
import { registerPushToken } from '../../services/notificationService';

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

      // 3. isOnboardingComplete 값에 따라 RootNavigator가 자동 분기
    };

    init();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 32, fontWeight: 'bold' }}>랜데루</Text>
    </View>
  );
}
