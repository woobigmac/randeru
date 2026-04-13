import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useUserStore } from '../store/useUserStore';
import OnboardingNavigator from './OnboardingNavigator';
import MainTabNavigator from './MainTabNavigator';

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const isOnboardingComplete = useUserStore((state) => state.isOnboardingComplete);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isOnboardingComplete ? (
        <Stack.Screen name="Main" component={MainTabNavigator} />
      ) : (
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      )}
    </Stack.Navigator>
  );
}
