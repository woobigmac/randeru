import React, { useCallback, useEffect, useState } from 'react';
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

export type RootStackParamList = {
  Splash: undefined;
  NotificationPermission: undefined;
  Login: undefined;
  Onboarding: undefined;
  Main: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const {
    user,
    isLoading,
    isLoggedIn,
    isOnboardingComplete,
    setPushSettings,
  } = useUserStore();
  const [isNotificationIntroLoading, setIsNotificationIntroLoading] = useState(true);
  const [hasSeenNotificationIntro, setHasSeenNotificationIntro] = useState(false);

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
