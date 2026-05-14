import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import NicknameScreen from '../screens/onboarding/NicknameScreen';

export type OnboardingStackParamList = {
  Onboarding: undefined;
  Nickname: undefined;
};

const Stack = createStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Nickname" component={NicknameScreen} />
    </Stack.Navigator>
  );
}
