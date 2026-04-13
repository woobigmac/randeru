import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeStackNavigator from './HomeStackNavigator';
import RecordsScreen from '../screens/tabs/RecordsScreen';
import MyPageScreen from '../screens/tabs/MyPageScreen';

export type MainTabParamList = {
  HomeTab: undefined;
  Records: undefined;
  MyPage: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{ title: '홈' }}
      />
      <Tab.Screen
        name="Records"
        component={RecordsScreen}
        options={{ title: '기록' }}
      />
      <Tab.Screen
        name="MyPage"
        component={MyPageScreen}
        options={{ title: '마이' }}
      />
    </Tab.Navigator>
  );
}
