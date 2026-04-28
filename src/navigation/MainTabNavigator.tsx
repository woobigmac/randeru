import React from 'react';
import { Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeStackNavigator from './HomeStackNavigator';
import RecordsStackNavigator from './RecordsStackNavigator';
import MyPageStackNavigator from './MyPageStackNavigator';

export type MainTabParamList = {
  HomeTab: undefined;
  Records: undefined;
  MyPage: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

// 탭별 커스텀 아이콘 — 추후 각 탭마다 다른 이미지로 교체 가능
const TAB_ICONS = {
  // HomeTab: { active: require('../assets/icons/home_active.png'), inactive: require('../assets/icons/home_inactive.png') },
  // Records:  { active: require('../assets/icons/records_active.png'), inactive: require('../assets/icons/records_inactive.png') },
  // MyPage:   { active: require('../assets/icons/mypage_active.png'), inactive: require('../assets/icons/mypage_inactive.png') },
  active: require('../assets/icons/tab_active.png'),
  inactive: require('../assets/icons/tab_inactive.png'),
};

function tabIcon(focused: boolean) {
  return (
    <Image
      source={focused ? TAB_ICONS.active : TAB_ICONS.inactive}
      style={{ width: 24, height: 24 }}
      resizeMode="contain"
    />
  );
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          title: '홈',
          tabBarIcon: ({ focused }) => tabIcon(focused),
        }}
      />
      <Tab.Screen
        name="Records"
        component={RecordsStackNavigator}
        options={{
          title: '기록',
          tabBarIcon: ({ focused }) => tabIcon(focused),
        }}
      />
      <Tab.Screen
        name="MyPage"
        component={MyPageStackNavigator}
        options={{
          title: '마이',
          tabBarIcon: ({ focused }) => tabIcon(focused),
        }}
      />
    </Tab.Navigator>
  );
}
