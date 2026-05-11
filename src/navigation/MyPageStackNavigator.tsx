import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MyPageScreen from '../screens/tabs/MyPageScreen';
import NotificationSettingScreen from '../screens/settings/NotificationSettingScreen';
import SettingScreen from '../screens/settings/SettingScreen';
import ProfileEditScreen from '../screens/settings/ProfileEditScreen';
import InquiryScreen from '../screens/settings/InquiryScreen';

export type MyPageStackParamList = {
  MyPageMain: undefined;
  NotificationSetting: undefined;
  Setting: undefined;
  ProfileEdit: undefined;
  Inquiry: undefined;
};

const Stack = createStackNavigator<MyPageStackParamList>();

export default function MyPageStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyPageMain" component={MyPageScreen} />
      <Stack.Screen
        name="NotificationSetting"
        component={NotificationSettingScreen}
        options={{ headerShown: true, title: '알림 설정', headerBackTitle: '' }}
      />
      <Stack.Screen
        name="Setting"
        component={SettingScreen}
        options={{ headerShown: true, title: '설정', headerBackTitle: '' }}
      />
      <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
      <Stack.Screen
        name="Inquiry"
        component={InquiryScreen}
        options={{ headerShown: true, title: '문의하기', headerBackTitle: '' }}
      />
    </Stack.Navigator>
  );
}
