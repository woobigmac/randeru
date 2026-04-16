import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useUserStore } from '../../store/useUserStore';
import {
  requestPermission,
  scheduleDailyNotification,
  cancelAllNotifications,
} from '../../services/notificationService';
import { PUSH_MESSAGES } from '../../constants';
import { Colors, Fonts, Radius, Spacing } from '../../constants/theme';

const randomMessage = () => PUSH_MESSAGES[Math.floor(Math.random() * PUSH_MESSAGES.length)];
const parseTime = (t: string) => { const [h, m] = t.split(':').map(Number); return { hour: h, minute: m }; };
const fmtTime = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

export default function NotificationSettingScreen() {
  const { user, setPushSettings } = useUserStore();
  const { hour: initH, minute: initM } = parseTime(user?.push_time ?? '09:00');

  const [enabled, setEnabled] = useState(user?.push_enabled ?? false);
  const [hour, setHour] = useState(initH);
  const [minute, setMinute] = useState(initM);
  const [previewMessage, setPreviewMessage] = useState(randomMessage);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = useCallback(async (value: boolean) => {
    setIsLoading(true);
    try {
      if (value) {
        const granted = await requestPermission();
        if (!granted) return;
        const time = fmtTime(hour, minute);
        await scheduleDailyNotification(time);
        await setPushSettings(true, time);
        setEnabled(true);
      } else {
        await cancelAllNotifications();
        await setPushSettings(false, fmtTime(hour, minute));
        setEnabled(false);
      }
    } catch (e) {
      console.error('toggle error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [hour, minute, setPushSettings]);

  const applyTime = useCallback(async (h: number, m: number) => {
    const time = fmtTime(h, m);
    try {
      await scheduleDailyNotification(time);
      await setPushSettings(true, time);
    } catch (e) { console.error(e); }
  }, [setPushSettings]);

  const changeHour = useCallback((delta: number) => {
    const newH = (hour + delta + 24) % 24;
    setHour(newH);
    if (enabled) applyTime(newH, minute);
  }, [hour, minute, enabled, applyTime]);

  const selectMinute = useCallback((m: number) => {
    setMinute(m);
    if (enabled) applyTime(hour, m);
  }, [hour, enabled, applyTime]);

  const handleTestNotification = useCallback(async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title: '랜데루', body: '테스트 알림이에요! 🎉', sound: true },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5,
          repeats: false,
        },
      });
      Alert.alert('테스트 알림', '5초 후 알림이 도착해요!');
    } catch {
      Alert.alert('안내', '시뮬레이터에서는 알림이 동작하지 않을 수 있어요.');
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ON/OFF */}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>매일 알림 받기</Text>
          {isLoading
            ? <ActivityIndicator size="small" color={Colors.primary} />
            : <Switch
                value={enabled}
                onValueChange={handleToggle}
                trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                thumbColor={enabled ? Colors.primary : Colors.white}
                ios_backgroundColor={Colors.border}
              />
          }
        </View>

        {/* 시간 설정 */}
        {enabled && (
          <View style={styles.timeCard}>
            <Text style={styles.cardLabel}>알림 시간</Text>

            <View style={styles.hourRow}>
              <Text style={styles.unitLabel}>시</Text>
              <TouchableOpacity onPress={() => changeHour(-1)} style={styles.arrowBtn}>
                <Text style={styles.arrowText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.timeValue}>{String(hour).padStart(2, '0')}</Text>
              <TouchableOpacity onPress={() => changeHour(1)} style={styles.arrowBtn}>
                <Text style={styles.arrowText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.minuteRow}>
              <Text style={styles.unitLabel}>분</Text>
              {[0, 30].map((m) => {
                const sel = minute === m;
                return (
                  <TouchableOpacity
                    key={m}
                    onPress={() => selectMinute(m)}
                    style={[styles.minuteBtn, sel && styles.minuteBtnSelected]}
                  >
                    <Text style={[styles.minuteText, sel && styles.minuteTextSelected]}>
                      {String(m).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.timeSummary}>
              매일 {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}에 알림을 드려요
            </Text>
          </View>
        )}

        {/* 문구 미리보기 */}
        <View style={styles.previewCard}>
          <Text style={styles.cardLabel}>알림 문구 미리보기</Text>
          <Text style={styles.previewText}>{previewMessage}</Text>
          <TouchableOpacity onPress={() => setPreviewMessage(randomMessage())} style={styles.refreshBtn}>
            <Text style={styles.refreshText}>다른 문구 보기</Text>
          </TouchableOpacity>
        </View>

        {/* 테스트 알림 — 개발용, 출시 전 제거 예정 */}
        <View style={styles.devSection}>
          <Text style={styles.devLabel}>개발용 (출시 전 제거 예정)</Text>
          <TouchableOpacity onPress={handleTestNotification} style={styles.testBtn}>
            <Text style={styles.testBtnText}>5초 후 테스트 알림 받기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowLabel: { fontSize: 16, fontWeight: '600', color: Colors.text },
  timeCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  hourRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: Spacing.md },
  unitLabel: { fontSize: 14, color: Colors.textSecondary, width: 20 },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  arrowText: { fontSize: 18, color: Colors.text },
  timeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    minWidth: 44,
    textAlign: 'center',
  },
  minuteRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  minuteBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  minuteBtnSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  minuteText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  minuteTextSelected: { color: Colors.white, fontWeight: '700' },
  timeSummary: { fontSize: 13, color: Colors.textSecondary },
  previewCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  previewText: {
    fontFamily: Fonts.handwriting,
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: Spacing.md,
  },
  refreshBtn: { alignSelf: 'center' },
  refreshText: { fontSize: 13, color: Colors.textSecondary, textDecorationLine: 'underline' },
  devSection: { marginTop: Spacing.xl },
  devLabel: { fontSize: 11, color: Colors.textTertiary, marginBottom: Spacing.sm },
  testBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
  },
  testBtnText: { fontSize: 14, color: Colors.textSecondary },
});
