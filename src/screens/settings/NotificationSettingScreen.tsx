import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { useUserStore } from '../../store/useUserStore';
import {
  requestPermission,
  scheduleDailyNotification,
  cancelAllNotifications,
} from '../../services/notificationService';
import { PUSH_MESSAGES } from '../../constants';

const randomMessage = () =>
  PUSH_MESSAGES[Math.floor(Math.random() * PUSH_MESSAGES.length)];

const parseTime = (time: string): { hour: number; minute: number } => {
  const [h, m] = time.split(':').map(Number);
  return { hour: h, minute: m };
};

const formatTime = (hour: number, minute: number): string =>
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

export default function NotificationSettingScreen() {
  const { user, setPushSettings } = useUserStore();

  const initialEnabled = user?.push_enabled ?? false;
  const initialTime = user?.push_time ?? '09:00';
  const { hour: initHour, minute: initMinute } = parseTime(initialTime);

  const [enabled, setEnabled] = useState(initialEnabled);
  const [hour, setHour] = useState(initHour);
  const [minute, setMinute] = useState(initMinute);
  const [previewMessage, setPreviewMessage] = useState(randomMessage);
  const [isLoading, setIsLoading] = useState(false);

  // ─── 알림 ON/OFF 토글 ─────────────────────────────────────────────────────
  const handleToggle = useCallback(
    async (value: boolean) => {
      setIsLoading(true);
      try {
        if (value) {
          const granted = await requestPermission();
          if (!granted) return; // Alert는 requestPermission 내부에서 표시
          const time = formatTime(hour, minute);
          await scheduleDailyNotification(time);
          await setPushSettings(true, time);
          setEnabled(true);
        } else {
          await cancelAllNotifications();
          await setPushSettings(false, formatTime(hour, minute));
          setEnabled(false);
        }
      } catch (e) {
        console.error('handleToggle error:', e);
      } finally {
        setIsLoading(false);
      }
    },
    [hour, minute, setPushSettings],
  );

  // ─── 시간 변경 ────────────────────────────────────────────────────────────
  const applyTimeChange = useCallback(
    async (newHour: number, newMinute: number) => {
      const time = formatTime(newHour, newMinute);
      try {
        await scheduleDailyNotification(time);
        await setPushSettings(true, time);
      } catch (e) {
        console.error('applyTimeChange error:', e);
      }
    },
    [setPushSettings],
  );

  const changeHour = useCallback(
    (delta: number) => {
      const newHour = (hour + delta + 24) % 24;
      setHour(newHour);
      if (enabled) applyTimeChange(newHour, minute);
    },
    [hour, minute, enabled, applyTimeChange],
  );

  const selectMinute = useCallback(
    (newMinute: number) => {
      setMinute(newMinute);
      if (enabled) applyTimeChange(hour, newMinute);
    },
    [hour, enabled, applyTimeChange],
  );

  // ─── 테스트 알림 (개발용 — 출시 전 제거 예정) ──────────────────────────────
  const handleTestNotification = useCallback(async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '랜데루',
          body: '테스트 알림입니다! 🎉',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5,
          repeats: false,
        },
      });
      Alert.alert('테스트 알림', '5초 후 알림이 도착해요!');
    } catch (e) {
      Alert.alert('오류', '시뮬레이터에서는 알림이 동작하지 않을 수 있어요.');
    }
  }, []);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
      {/* 알림 ON/OFF */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#f0f0f0',
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '600' }}>매일 알림 받기</Text>
        {isLoading ? (
          <ActivityIndicator size="small" />
        ) : (
          <Switch value={enabled} onValueChange={handleToggle} />
        )}
      </View>

      {/* 알림 시간 설정 (enabled일 때만) */}
      {enabled && (
        <View style={{ paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
          <Text style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>알림 시간</Text>

          {/* 시간(Hour) 선택 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 14, color: '#555', width: 40 }}>시</Text>
            <TouchableOpacity
              onPress={() => changeHour(-1)}
              style={{ padding: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 6 }}
            >
              <Text style={{ fontSize: 16 }}>−</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginHorizontal: 20, minWidth: 32, textAlign: 'center' }}>
              {String(hour).padStart(2, '0')}
            </Text>
            <TouchableOpacity
              onPress={() => changeHour(1)}
              style={{ padding: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 6 }}
            >
              <Text style={{ fontSize: 16 }}>+</Text>
            </TouchableOpacity>
          </View>

          {/* 분(Minute) 선택: 00 / 30 */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: '#555', width: 40 }}>분</Text>
            {[0, 30].map((m) => {
              const isSelected = minute === m;
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => selectMinute(m)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 20,
                    marginRight: 10,
                    borderWidth: 1.5,
                    borderColor: isSelected ? '#000' : '#ddd',
                    borderRadius: 8,
                    backgroundColor: isSelected ? '#000' : '#fff',
                  }}
                >
                  <Text style={{ color: isSelected ? '#fff' : '#333', fontWeight: isSelected ? 'bold' : 'normal' }}>
                    {String(m).padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={{ fontSize: 13, color: '#888', marginTop: 16 }}>
            매일 {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}에 알림을 보내드려요
          </Text>
        </View>
      )}

      {/* 푸시 문구 미리보기 */}
      <View style={{ paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
        <Text style={{ fontSize: 14, color: '#888', marginBottom: 12 }}>알림 문구 미리보기</Text>
        <View
          style={{
            padding: 16,
            backgroundColor: '#f8f8f8',
            borderRadius: 10,
            marginBottom: 10,
          }}
        >
          <Text style={{ fontSize: 14, color: '#333', lineHeight: 20 }}>{previewMessage}</Text>
        </View>
        <TouchableOpacity onPress={() => setPreviewMessage(randomMessage())}>
          <Text style={{ fontSize: 13, color: '#555', textDecorationLine: 'underline' }}>
            다른 문구 보기
          </Text>
        </TouchableOpacity>
      </View>

      {/* 테스트 알림 버튼 — 개발용, 출시 전 제거 예정 */}
      <View style={{ paddingTop: 24 }}>
        <Text style={{ fontSize: 12, color: '#bbb', marginBottom: 8 }}>개발용 (출시 전 제거 예정)</Text>
        <TouchableOpacity
          onPress={handleTestNotification}
          style={{
            paddingVertical: 12,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 8,
          }}
        >
          <Text style={{ fontSize: 14, color: '#555' }}>5초 후 테스트 알림 받기</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
