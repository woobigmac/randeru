import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MyPageScreen from '../screens/tabs/MyPageScreen';
import ToneSelectScreen from '../screens/onboarding/ToneSelectScreen';
import NotificationSettingScreen from '../screens/settings/NotificationSettingScreen';

export type MyPageStackParamList = {
  MyPageMain: undefined;
  ToneSelect: undefined;
  NotificationSetting: undefined;
};

const Stack = createStackNavigator<MyPageStackParamList>();

export default function MyPageStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyPageMain" component={MyPageScreen} />
      <Stack.Screen
        name="ToneSelect"
        component={ToneSelectScreen}
        options={{ headerShown: true, title: '관심 톤 설정', headerBackTitle: '' }}
      />
      <Stack.Screen
        name="NotificationSetting"
        component={NotificationSettingScreen}
        options={{ headerShown: true, title: '알림 설정', headerBackTitle: '' }}
      />
    </Stack.Navigator>
  );
}
