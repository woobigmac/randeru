import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform, Linking, Alert } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { PUSH_MESSAGES } from '../constants';

// 포그라운드 알림 핸들러 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Android 알림 채널 설정
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: '랜데루 알림',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}

/**
 * 알림 권한을 요청한다.
 * 허용 시 true, 거부 시 false 반환.
 * 거부 시 설정 앱으로 안내 Alert를 표시한다.
 */
export async function requestPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') return true;

    // 권한 거부 — 설정 앱 안내
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

/**
 * Expo 푸시 토큰을 발급받아 Firestore users/{userId}에 저장한다.
 * 실제 기기에서만 동작하며, 시뮬레이터에서는 에러를 무시한다.
 */
export async function registerPushToken(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    await setDoc(
      doc(db, 'users', userId),
      { push_token: tokenData.data },
      { merge: true },
    );
  } catch (e) {
    // 시뮬레이터 또는 development 빌드에서 실패할 수 있음
    console.warn('registerPushToken error (시뮬레이터에서는 지원 안 됨):', e);
  }
}

/**
 * 매일 지정 시간에 푸시 알림을 스케줄링한다.
 * time 형식: 'HH:MM' (예: '09:00')
 * 기존 스케줄은 취소 후 재등록.
 */
export async function scheduleDailyNotification(time: string): Promise<void> {
  try {
    const [hourStr, minuteStr] = time.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    const message = PUSH_MESSAGES[Math.floor(Math.random() * PUSH_MESSAGES.length)];

    await Notifications.cancelAllScheduledNotificationsAsync();

    await Notifications.scheduleNotificationAsync({
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
  } catch (e) {
    console.warn('scheduleDailyNotification error:', e);
  }
}

/**
 * 모든 스케줄된 알림을 취소한다.
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('cancelAllNotifications error:', e);
  }
}

/**
 * 현재 스케줄된 알림 목록을 반환한다. (디버깅용)
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('getScheduledNotifications error:', e);
    return [];
  }
}
