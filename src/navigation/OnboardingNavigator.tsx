import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import NicknameScreen from '../screens/onboarding/NicknameScreen';
import ToneSelectScreen from '../screens/onboarding/ToneSelectScreen';
import AgeSelectScreen from '../screens/onboarding/AgeSelectScreen';

export type OnboardingStackParamList = {
  Onboarding: undefined;
  Nickname: undefined;
  ToneSelect: undefined;
  AgeSelect: undefined;
};

const Stack = createStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Nickname" component={NicknameScreen} />
      <Stack.Screen name="ToneSelect" component={ToneSelectScreen} />
      <Stack.Screen name="AgeSelect" component={AgeSelectScreen} />
    </Stack.Navigator>
  );
}
