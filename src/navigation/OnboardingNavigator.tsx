import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SplashScreen from '../screens/onboarding/SplashScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import NicknameScreen from '../screens/onboarding/NicknameScreen';
import ToneSelectScreen from '../screens/onboarding/ToneSelectScreen';

export type OnboardingStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Nickname: undefined;
  ToneSelect: undefined;
};

const Stack = createStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Nickname" component={NicknameScreen} />
      <Stack.Screen name="ToneSelect" component={ToneSelectScreen} />
    </Stack.Navigator>
  );
}
