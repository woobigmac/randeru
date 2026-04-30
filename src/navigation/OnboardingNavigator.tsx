import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import NicknameScreen from '../screens/onboarding/NicknameScreen';
import AgeSelectScreen from '../screens/onboarding/AgeSelectScreen';

export type OnboardingStackParamList = {
  Onboarding: undefined;
  Nickname: undefined;
  AgeSelect: undefined;
};

const Stack = createStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Nickname" component={NicknameScreen} />
      <Stack.Screen name="AgeSelect" component={AgeSelectScreen} />
    </Stack.Navigator>
  );
}
