import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Header } from '../../components/Header';
import { EmptyState } from '../../components/EmptyState';
import { MyPageStackParamList } from '../../navigation/MyPageStackNavigator';
import { useUserStore } from '../../store/useUserStore';
import {
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../../services/inAppNotificationService';
import { InAppNotification } from '../../types';
import { Colors, Fonts, Radius, Spacing } from '../../constants/theme';

type Props = {
  navigation: StackNavigationProp<MyPageStackParamList, 'NotificationCenter'>;
};

function formatNotificationTime(date?: Date): string {
  if (!date) return '';
  const now = Date.now();
  const diffMinutes = Math.floor((now - date.getTime()) / 60000);
  if (diffMinutes < 1) return '방금';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function getNotificationAccent(type: InAppNotification['type']): string {
  if (type === 'friend_action_completed') return '#DDEEDB';
  if (type === 'friend_action_started') return Colors.primaryLight;
  if (type === 'friend_action_shared') return Colors.surface;
  return Colors.white;
}

export default function NotificationCenterScreen({ navigation }: Props) {
  const user = useUserStore((state) => state.user);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user?.user_id) return;
    setIsLoading(true);
    try {
      const nextNotifications = await getUserNotifications(user.user_id);
      setNotifications(nextNotifications);
    } catch (error) {
      console.warn('loadNotifications error:', error);
      Alert.alert('알림을 불러오지 못했어요', '잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.user_id]);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications]),
  );

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  const handlePressNotification = async (notification: InAppNotification) => {
    if (!user?.user_id) return;
    try {
      if (!notification.is_read) {
        await markNotificationAsRead(user.user_id, notification.notification_id);
        setNotifications((prev) =>
          prev.map((item) =>
            item.notification_id === notification.notification_id
              ? { ...item, is_read: true, read_at: new Date() }
              : item,
          ),
        );
      }
      if (
        notification.type === 'friend_action_shared' ||
        notification.type === 'friend_action_started' ||
        notification.type === 'friend_action_completed'
      ) {
        navigation.navigate('Friends');
      }
    } catch (error) {
      console.warn('handlePressNotification error:', error);
      Alert.alert('알림 처리 실패', '잠시 후 다시 시도해주세요.');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.user_id || unreadCount === 0) return;
    setIsMarkingAll(true);
    try {
      await markAllNotificationsAsRead(user.user_id);
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, is_read: true, read_at: new Date() })),
      );
    } catch (error) {
      console.warn('markAllNotificationsAsRead error:', error);
      Alert.alert('읽음 처리 실패', '잠시 후 다시 시도해주세요.');
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="알림"
        showBack
        rightElement={
          unreadCount > 0 ? (
            <TouchableOpacity
              onPress={handleMarkAllAsRead}
              disabled={isMarkingAll}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.readAllText}>
                {isMarkingAll ? '처리' : '읽음'}
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : notifications.length === 0 ? (
        <EmptyState
          message="아직 알림이 없어요"
          ctaLabel="친구 초대하러 가기"
          onCtaPress={() => navigation.navigate('Friends')}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              새 알림 {unreadCount}개
            </Text>
          </View>

          {notifications.map((notification) => (
            <TouchableOpacity
              key={notification.notification_id}
              onPress={() => handlePressNotification(notification)}
              activeOpacity={0.75}
              style={[
                styles.notificationItem,
                !notification.is_read && styles.notificationItemUnread,
              ]}
            >
              <View
                style={[
                  styles.notificationAccent,
                  { backgroundColor: getNotificationAccent(notification.type) },
                ]}
              />
              <View style={styles.notificationBody}>
                <View style={styles.notificationTopRow}>
                  <Text style={styles.notificationTitle} numberOfLines={1}>
                    {notification.title}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {formatNotificationTime(notification.created_at)}
                  </Text>
                </View>
                <Text style={styles.notificationText}>{notification.body}</Text>
              </View>
              {!notification.is_read ? <View style={styles.unreadDot} /> : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  readAllText: { fontSize: 12, color: Colors.primary, fontWeight: '700' },
  list: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  summaryRow: { marginBottom: Spacing.md },
  summaryText: {
    fontFamily: Fonts.handwriting,
    fontSize: 20,
    color: Colors.text,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  notificationItemUnread: {
    borderColor: Colors.primaryLight,
  },
  notificationAccent: { width: 8 },
  notificationBody: { flex: 1, padding: Spacing.md },
  notificationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  notificationTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.text },
  notificationTime: { fontSize: 11, color: Colors.textTertiary },
  notificationText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  unreadDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
});
