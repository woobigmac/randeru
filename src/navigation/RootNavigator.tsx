import React, { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useUserStore } from '../store/useUserStore';
import SplashScreen from '../screens/onboarding/SplashScreen';
import NotificationPermissionScreen from '../screens/onboarding/NotificationPermissionScreen';
import LoginScreen from '../screens/onboarding/LoginScreen';
import OnboardingNavigator from './OnboardingNavigator';
import MainTabNavigator from './MainTabNavigator';
import { DEFAULT_PUSH_TIME } from '../constants';
import {
  clearInitialNotificationOptIn,
  DEFAULT_NOTIFICATION_SLOTS,
  getInitialNotificationOptIn,
  hasNotificationPermission,
  hasSeenInitialNotificationPrompt,
  registerPushToken,
  scheduleDailySlotNotifications,
} from '../services/notificationService';
import { parseInviteCodeFromUrl } from '../services/deepLinkService';
import {
  clearPendingInviteCode,
  loadPendingInviteCode,
  savePendingInviteCode,
} from '../services/pendingInviteStorage';

export type RootStackParamList = {
  Splash: undefined;
  NotificationPermission: undefined;
  Login: undefined;
  Onboarding: undefined;
  Main: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const {
    user,
    isLoading,
    isLoggedIn,
    isOnboardingComplete,
    setPushSettings,
  } = useUserStore();
  const [isNotificationIntroLoading, setIsNotificationIntroLoading] = useState(true);
  const [hasSeenNotificationIntro, setHasSeenNotificationIntro] = useState(false);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    hasSeenInitialNotificationPrompt()
      .then((seen) => {
        if (isMounted) setHasSeenNotificationIntro(seen);
      })
      .finally(() => {
        if (isMounted) setIsNotificationIntroLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 앱 재시작 시 AsyncStorage에서 미처리 초대 코드 복원
  useEffect(() => {
    loadPendingInviteCode().then((saved) => {
      if (saved) setPendingInviteCode(saved);
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    const handleUrl = (url: string | null) => {
      if (!url) return;
      const inviteCode = parseInviteCodeFromUrl(url);
      if (inviteCode) {
        setPendingInviteCode(inviteCode);
        void savePendingInviteCode(inviteCode);
      }
    };

    Linking.getInitialURL()
      .then((url) => {
        if (isMounted) handleUrl(url);
      })
      .catch((e) => {
        console.warn('getInitialURL error:', e);
      });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (
      !pendingInviteCode ||
      isLoading ||
      isNotificationIntroLoading ||
      !hasSeenNotificationIntro ||
      !isLoggedIn ||
      !isOnboardingComplete
    ) {
      return;
    }

    navigation.navigate('Main', {
      screen: 'MyPage',
      params: {
        screen: 'Friends',
        params: { inviteCode: pendingInviteCode },
      },
    } as never);
    setPendingInviteCode(null);
    void clearPendingInviteCode();
  }, [
    hasSeenNotificationIntro,
    isLoading,
    isLoggedIn,
    isNotificationIntroLoading,
    isOnboardingComplete,
    navigation,
    pendingInviteCode,
  ]);

  useEffect(() => {
    if (!hasSeenNotificationIntro || !isLoggedIn || !isOnboardingComplete || !user?.user_id) {
      return;
    }

    let isActive = true;

    const applyInitialNotificationChoice = async () => {
      const optedIn = await getInitialNotificationOptIn();
      if (!optedIn) return;

      await clearInitialNotificationOptIn();

      const granted = await hasNotificationPermission();
      if (!granted || !isActive) return;

      const slots = user.push_slots ?? DEFAULT_NOTIFICATION_SLOTS;
      await scheduleDailySlotNotifications(slots);
      await setPushSettings(true, user.push_time ?? DEFAULT_PUSH_TIME, slots);
      await registerPushToken(user.user_id);
    };

    applyInitialNotificationChoice().catch((e) => {
      console.warn('applyInitialNotificationChoice error:', e);
    });

    return () => {
      isActive = false;
    };
  }, [
    hasSeenNotificationIntro,
    isLoggedIn,
    isOnboardingComplete,
    setPushSettings,
    user,
  ]);

  const handleNotificationIntroComplete = useCallback(() => {
    setHasSeenNotificationIntro(true);
  }, []);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoading || isNotificationIntroLoading ? (
        <Stack.Screen name="Splash" component={SplashScreen} />
      ) : !hasSeenNotificationIntro ? (
        <Stack.Screen name="NotificationPermission">
          {() => <NotificationPermissionScreen onComplete={handleNotificationIntroComplete} />}
        </Stack.Screen>
      ) : !isLoggedIn ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : isOnboardingComplete ? (
        <Stack.Screen name="Main" component={MainTabNavigator} />
      ) : (
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      )}
    </Stack.Navigator>
  );
}
