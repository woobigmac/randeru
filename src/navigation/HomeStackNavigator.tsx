import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Action, DailyRecord } from '../types';
import HomeScreen from '../screens/home/HomeScreen';
import ActionDetailScreen from '../screens/home/ActionDetailScreen';
import PhotoScreen from '../screens/record/PhotoScreen';
import CompleteScreen from '../screens/record/CompleteScreen';
import ShareScreen from '../screens/record/ShareScreen';

export type HomeStackParamList = {
  Home: undefined;
  ActionDetail: { action: Action };
  Photo: { recordId: string };
  Complete: { recordId: string };
  Share: { record: DailyRecord; action: Action };
};

const Stack = createStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="ActionDetail" component={ActionDetailScreen} />
      <Stack.Screen name="Photo" component={PhotoScreen} />
      <Stack.Screen name="Complete" component={CompleteScreen} />
      <Stack.Screen name="Share" component={ShareScreen} />
    </Stack.Navigator>
  );
}
