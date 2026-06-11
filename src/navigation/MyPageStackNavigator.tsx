import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MyPageScreen from '../screens/tabs/MyPageScreen';
import NotificationSettingScreen from '../screens/settings/NotificationSettingScreen';
import SettingScreen from '../screens/settings/SettingScreen';
import ProfileEditScreen from '../screens/settings/ProfileEditScreen';
import InquiryScreen from '../screens/settings/InquiryScreen';
import FriendsScreen from '../screens/friends/FriendsScreen';
import NotificationCenterScreen from '../screens/notifications/NotificationCenterScreen';
import PhotoScreen from '../screens/record/PhotoScreen';
import CompleteScreen from '../screens/record/CompleteScreen';
import ShareScreen from '../screens/record/ShareScreen';
import { Action, DailyRecord } from '../types';

export type MyPageStackParamList = {
  MyPageMain: undefined;
  NotificationSetting: undefined;
  Setting: undefined;
  ProfileEdit: undefined;
  Inquiry: undefined;
  Friends: { inviteCode?: string; section?: 'friends' | 'receivedActions' | 'sentActions' | 'sentInvites' } | undefined;
  NotificationCenter: undefined;
  Photo: { recordId: string; action: Action; friendActionShareId?: string };
  Complete: { recordId: string; actionTitle?: string; source?: DailyRecord['source'] };
  Share: { record: DailyRecord; action: Action };
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
      <Stack.Screen name="Friends" component={FriendsScreen} />
      <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} />
      <Stack.Screen name="Photo" component={PhotoScreen} />
      <Stack.Screen name="Complete" component={CompleteScreen} />
      <Stack.Screen name="Share" component={ShareScreen} />
      <Stack.Screen
        name="Inquiry"
        component={InquiryScreen}
        options={{ headerShown: true, title: '문의하기', headerBackTitle: '' }}
      />
    </Stack.Navigator>
  );
}
