import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

export async function scheduleDailyPushNotification(
  hour: number,
  minute: number,
  message: string,
): Promise<string> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '랜데루',
      body: message,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return id;
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Android 알림 채널 설정
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: '랜데루 알림',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}
