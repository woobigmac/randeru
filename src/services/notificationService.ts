import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform, Linking, Alert } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { PUSH_MESSAGES } from '../constants';

type SlotSettings = { morning: boolean; lunch: boolean; evening: boolean };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: '랜데루 알림',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}

export async function requestPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') return true;

    Alert.alert(
      '알림 권한 필요',
      '알림 설정에서 직접 허용해주세요.',
      [
        { text: '취소', style: 'cancel' },
        { text: '설정으로 이동', onPress: () => Linking.openSettings() },
      ],
    );
    return false;
  } catch (e) {
    console.warn('requestPermission error:', e);
    return false;
  }
}

export async function hasNotificationPermission(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.warn('hasNotificationPermission error:', e);
    return false;
  }
}

export async function registerPushToken(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    await setDoc(doc(db, 'users', userId), { push_token: tokenData.data }, { merge: true });
  } catch (e) {
    console.warn('registerPushToken error (시뮬레이터에서는 지원 안 됨):', e);
  }
}

/**
 * 단일 시간 기반 알림 등록 (하위 호환).
 */
export async function scheduleDailyNotification(time: string): Promise<void> {
  try {
    const [hourStr, minuteStr] = time.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    const message = PUSH_MESSAGES[Math.floor(Math.random() * PUSH_MESSAGES.length)];

    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: { title: '랜데루', body: message, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } catch (e) {
    console.warn('scheduleDailyNotification error:', e);
  }
}

/**
 * 3개 슬롯별 알림을 등록한다.
 * enabledSlots: 활성화할 슬롯 설정. undefined면 전체 활성화.
 */
export async function scheduleDailySlotNotifications(
  enabledSlots?: SlotSettings,
): Promise<number> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const slots = [
      {
        id: 'morning',
        hour: 7,
        minute: 0,
        title: '🌸 아침 랜데루가 도착했어요',
        enabled: enabledSlots?.morning ?? true,
      },
      {
        id: 'lunch',
        hour: 12,
        minute: 30,
        title: '☀️ 점심 랜데루, 잠깐 쉬어가요',
        enabled: enabledSlots?.lunch ?? true,
      },
      {
        id: 'evening',
        hour: 19,
        minute: 0,
        title: '🌙 저녁 랜데루로 하루를 마무리해요',
        enabled: enabledSlots?.evening ?? true,
      },
    ];

    let scheduledCount = 0;
    for (const slot of slots) {
      if (!slot.enabled) continue;
      await Notifications.scheduleNotificationAsync({
        content: { title: '랜데루', body: slot.title, sound: true },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: slot.hour,
          minute: slot.minute,
        },
      });
      scheduledCount += 1;
    }
    return scheduledCount;
  } catch (e) {
    console.warn('scheduleDailySlotNotifications error:', e);
    return 0;
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('cancelAllNotifications error:', e);
  }
}

export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('getScheduledNotifications error:', e);
    return [];
  }
}
