import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Action, DailyRecord } from '../types';
import RecordsScreen from '../screens/tabs/RecordsScreen';
import RecordDetailScreen from '../screens/record/RecordDetailScreen';
import ShareScreen from '../screens/record/ShareScreen';

export type RecordsStackParamList = {
  RecordsList: undefined;
  RecordDetail: { record: DailyRecord; action: Action };
  Share: { record: DailyRecord; action: Action };
};

const Stack = createStackNavigator<RecordsStackParamList>();

export default function RecordsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RecordsList" component={RecordsScreen} />
      <Stack.Screen name="RecordDetail" component={RecordDetailScreen} />
      <Stack.Screen name="Share" component={ShareScreen} />
    </Stack.Navigator>
  );
}
