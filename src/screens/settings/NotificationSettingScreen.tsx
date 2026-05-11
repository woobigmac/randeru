import React, { useState } from 'react';
import {
  View,
  Text,
  Switch,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '../../store/useUserStore';
import {
  requestPermission,
  scheduleDailySlotNotifications,
  cancelAllNotifications,
} from '../../services/notificationService';
import { DAILY_SLOTS } from '../../constants';
import { Colors, Radius, Spacing } from '../../constants/theme';

type SlotKey = 'morning' | 'lunch' | 'evening';

const DEFAULT_SLOTS = { morning: true, lunch: true, evening: true };

export default function NotificationSettingScreen() {
  const { user, setPushSettings } = useUserStore();

  const [masterEnabled, setMasterEnabled] = useState(user?.push_enabled ?? false);
  const [slots, setSlots] = useState<{ morning: boolean; lunch: boolean; evening: boolean }>(
    user?.push_slots ?? DEFAULT_SLOTS,
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleMasterToggle = async (value: boolean) => {
    setIsLoading(true);
    try {
      if (value) {
        const granted = await requestPermission();
        if (!granted) return;
        await scheduleDailySlotNotifications(slots);
        await setPushSettings(true, user?.push_time ?? '09:00', slots);
        setMasterEnabled(true);
      } else {
        await cancelAllNotifications();
        await setPushSettings(false, user?.push_time ?? '09:00', slots);
        setMasterEnabled(false);
      }
    } catch (e) {
      console.error('masterToggle error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSlotToggle = async (key: SlotKey, value: boolean) => {
    const updated = { ...slots, [key]: value };
    setSlots(updated);
    if (masterEnabled) {
      try {
        await scheduleDailySlotNotifications(updated);
        await setPushSettings(masterEnabled, user?.push_time ?? '09:00', updated);
      } catch (e) {
        console.error('slotToggle error:', e);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* 전체 알림 ON/OFF */}
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowLabel}>알림 받기</Text>
            <Text style={styles.rowSub}>랜데루가 알림을 보내드려요</Text>
          </View>
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Switch
              value={masterEnabled}
              onValueChange={handleMasterToggle}
              trackColor={{ false: Colors.border, true: Colors.primaryLight }}
              thumbColor={masterEnabled ? Colors.primary : Colors.white}
              ios_backgroundColor={Colors.border}
            />
          )}
        </View>

        {/* 슬롯별 알림 설정 */}
        {masterEnabled && (
          <View style={styles.slotSection}>
            <Text style={styles.sectionLabel}>슬롯별 알림 시간</Text>
            <Text style={styles.sectionSub}>각 시간대 알림을 개별 설정할 수 있어요</Text>

            {DAILY_SLOTS.map((slot) => {
              const key = slot.id as SlotKey;
              const enabled = slots[key];
              return (
                <View key={slot.id} style={styles.slotRow}>
                  <View style={styles.slotLeft}>
                    <Text style={styles.slotLabel}>{slot.label}</Text>
                    <Text style={styles.slotTime}>{slot.time}</Text>
                  </View>
                  <Switch
                    value={enabled}
                    onValueChange={(v) => handleSlotToggle(key, v)}
                    trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                    thumbColor={enabled ? Colors.primary : Colors.white}
                    ios_backgroundColor={Colors.border}
                  />
                </View>
              );
            })}
          </View>
        )}

        {/* 알림 문구 안내 */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>알림 내용</Text>
          <Text style={styles.infoItem}>🌸 아침 07:00 — 아침 랜데루가 도착했어요</Text>
          <Text style={styles.infoItem}>☀️ 점심 12:30 — 점심 랜데루, 잠깐 쉬어가요</Text>
          <Text style={styles.infoItem}>🌙 저녁 19:00 — 저녁 랜데루로 하루를 마무리해요</Text>
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
  rowLeft: { flex: 1, marginRight: Spacing.md },
  rowLabel: { fontSize: 16, fontWeight: '600', color: Colors.text },
  rowSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  slotSection: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  sectionSub: { fontSize: 12, color: Colors.textSecondary, marginBottom: Spacing.md },

  slotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  slotLeft: { flex: 1 },
  slotLabel: { fontSize: 15, fontWeight: '500', color: Colors.text },
  slotTime: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },

  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  infoTitle: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
  infoItem: { fontSize: 13, color: Colors.textSecondary, lineHeight: 22 },
});
