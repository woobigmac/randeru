import React, { useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useUserStore } from '../../store/useUserStore';
import { useActionStore } from '../../store/useActionStore';
import { HomeStackParamList } from '../../navigation/HomeStackNavigator';
import { MainTabParamList } from '../../navigation/MainTabNavigator';
import { DAILY_SLOTS, MAX_RESHUFFLE_COUNT } from '../../constants';
import { DailySlotStatus, SlotId } from '../../types';
import { Colors, Fonts, Radius, Spacing } from '../../constants/theme';
import { ActionCard } from '../../components/ActionCard';
import { Button } from '../../components/Button';

type HomeNavigationProp = CompositeNavigationProp<
  StackNavigationProp<HomeStackParamList, 'Home'>,
  BottomTabNavigationProp<MainTabParamList>
>;

type Props = { navigation: HomeNavigationProp };

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};

export default function HomeScreen({ navigation }: Props) {
  const user = useUserStore((s) => s.user);
  const {
    todaySlots,
    activeSlotId,
    isLoading,
    isAdLoading,
    error,
    loadTodaySlots,
    receiveSlotAction,
    setActiveSlot,
    reshuffleWithAd,
  } = useActionStore();

  useEffect(() => {
    if (user?.user_id) loadTodaySlots(user.user_id);
  }, [user?.user_id]);

  const activeSlot = todaySlots.find((s) => s.slot_id === activeSlotId) ?? null;
  const completedCount = todaySlots.filter(
    (s) => s.status === 'completed',
  ).length;

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            label="다시 시도"
            onPress={() => user?.user_id && loadTodaySlots(user.user_id)}
            variant="secondary"
            style={{ marginTop: Spacing.md }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 인사 */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {user?.nickname ? `${user.nickname}님,` : '안녕하세요,'}
        </Text>
        <Text style={styles.date}>{getTodayStr()}</Text>
      </View>

      {/* 슬롯 탭 */}
      <View style={styles.tabRow}>
        {DAILY_SLOTS.map((slot) => {
          const slotData = todaySlots.find((s) => s.slot_id === slot.id);
          const isActive = activeSlotId === slot.id;
          const isCompleted = slotData?.status === 'completed';
          const isLocked = slotData?.status === 'locked';

          return (
            <TouchableOpacity
              key={slot.id}
              onPress={() => setActiveSlot(slot.id)}
              activeOpacity={0.75}
              style={[
                styles.tab,
                isActive && styles.tabActive,
                isLocked && styles.tabLocked,
              ]}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive, isLocked && styles.tabLabelLocked]}>
                {isCompleted ? '✓ ' : isLocked ? '🔒 ' : ''}{slot.label}
              </Text>
              <Text style={[styles.tabTime, isActive && styles.tabTimeActive, isLocked && styles.tabTimeLocked]}>
                {slot.time}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 슬롯 콘텐츠 */}
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <SlotContent
          slot={activeSlot}
          slotId={activeSlotId}
          isAdLoading={isAdLoading}
          onReceive={() => {
            if (user?.user_id && activeSlotId) {
              receiveSlotAction(user.user_id, activeSlotId);
            }
          }}
          onReshuffle={() => {
            if (user?.user_id) reshuffleWithAd(user.user_id);
          }}
          onDetail={() => {
            if (activeSlot?.action) {
              navigation.navigate('ActionDetail', { action: activeSlot.action });
            }
          }}
          onComplete={() => {
            if (activeSlot?.record) {
              navigation.navigate('Photo', {
                recordId: activeSlot.record.record_id,
                action: activeSlot.action!,
              });
            }
          }}
          onShare={() => {
            if (activeSlot?.record && activeSlot?.action) {
              navigation.navigate('Share', {
                record: activeSlot.record,
                action: activeSlot.action,
              });
            }
          }}
          onRecords={() => navigation.navigate('Records')}
        />
      </ScrollView>

      {/* 하단 오늘의 진행 */}
      <View style={styles.progress}>
        {completedCount === 3 ? (
          <Text style={styles.progressDone}>오늘 하루 정말 인간다웠어요 🌸</Text>
        ) : (
          <Text style={styles.progressText}>오늘 {completedCount}/3 완료</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── 슬롯별 콘텐츠 ────────────────────────────────────────────────────────────
type SlotContentProps = {
  slot: DailySlotStatus | null;
  slotId: SlotId | null;
  isAdLoading: boolean;
  onReceive: () => void;
  onReshuffle: () => void;
  onDetail: () => void;
  onComplete: () => void;
  onShare: () => void;
  onRecords: () => void;
};

function SlotContent({ slot, slotId, isAdLoading, onReceive, onReshuffle, onDetail, onComplete, onShare, onRecords }: SlotContentProps) {
  if (!slot || !slotId) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  const slotDef = DAILY_SLOTS.find((s) => s.id === slot.slot_id);

  // locked
  if (slot.status === 'locked') {
    return (
      <View style={styles.slotContent}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.lockText}>{slotDef?.time}에 열려요</Text>
        <Text style={styles.lockSub}>{slot.label} 랜데루를 기다려주세요</Text>
      </View>
    );
  }

  // available
  if (slot.status === 'available') {
    return (
      <View style={styles.slotContent}>
        <View style={styles.dashedCard}>
          <Text style={styles.dashedTitle}>{slot.label}의 액션을{'\n'}뽑아볼까요?</Text>
          <Text style={styles.dashedSub}>매 시간대마다 새로운 랜데루</Text>
        </View>
        <Button
          label={`${slot.label} 액션 뽑기`}
          onPress={onReceive}
          style={styles.mainButton}
          disabled={isAdLoading}
        />
      </View>
    );
  }

  // accepted
  if (slot.status === 'accepted' && slot.action) {
    const reshuffleCount = slot.record?.reshuffle_count ?? 0;
    const canReshuffle = reshuffleCount < MAX_RESHUFFLE_COUNT;
    const reshuffleLeft = MAX_RESHUFFLE_COUNT - reshuffleCount;

    return (
      <View style={styles.slotContent}>
        <ActionCard
          action={slot.action}
          status="accepted"
          onPress={onDetail}
        />
        <Button
          label="자세히 보기"
          onPress={onDetail}
          style={styles.mainButton}
        />
        <Button
          label="완료 인증하기"
          onPress={onComplete}
          variant="secondary"
          style={{ marginTop: Spacing.sm }}
        />
        {canReshuffle && (
          <Button
            label={isAdLoading ? '광고 로딩 중...' : `다시뽑기 (${reshuffleLeft}회 남음)`}
            onPress={onReshuffle}
            variant="text"
            style={{ marginTop: Spacing.sm }}
            disabled={isAdLoading}
          />
        )}
      </View>
    );
  }

  // completed
  if ((slot.status === 'completed') && slot.action) {
    return (
      <View style={styles.slotContent}>
        <View style={styles.completedBadge}>
          <Text style={styles.completedBadgeText}>✓ 완료</Text>
        </View>
        <ActionCard
          action={slot.action}
          status="completed"
          onPress={() => {}}
        />
        <Button
          label="기록 보기"
          onPress={onRecords}
          variant="secondary"
          style={styles.mainButton}
        />
        {slot.record?.status !== 'shared' && slot.record && (
          <Button
            label="공유하기"
            onPress={onShare}
            style={{ marginTop: Spacing.sm }}
          />
        )}
      </View>
    );
  }

  return null;
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  greeting: {
    fontFamily: Fonts.handwriting,
    fontSize: 24,
    color: Colors.text,
  },
  date: { fontSize: 13, color: Colors.textTertiary, marginTop: 2 },

  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  tabLocked: { opacity: 0.45 },
  tabLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 2 },
  tabLabelActive: { color: Colors.primary },
  tabLabelLocked: { color: Colors.textTertiary },
  tabTime: { fontSize: 11, color: Colors.textTertiary },
  tabTimeActive: { color: Colors.primaryDark },
  tabTimeLocked: { color: Colors.textTertiary },

  body: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    flexGrow: 1,
  },

  slotContent: { flex: 1, justifyContent: 'center' },

  lockIcon: { fontSize: 48, textAlign: 'center', marginBottom: Spacing.md },
  lockText: {
    fontFamily: Fonts.handwriting,
    fontSize: 20,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  lockSub: { fontSize: 14, color: Colors.textTertiary, textAlign: 'center' },

  dashedCard: {
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  dashedTitle: {
    fontFamily: Fonts.handwriting,
    fontSize: 22,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    lineHeight: 32,
  },
  dashedSub: { fontSize: 14, color: Colors.textTertiary },

  completedBadge: {
    alignSelf: 'center',
    backgroundColor: Colors.success + '22',
    borderRadius: Radius.full,
    paddingVertical: 4,
    paddingHorizontal: 14,
    marginBottom: Spacing.md,
  },
  completedBadgeText: { fontSize: 13, color: Colors.success, fontWeight: '600' },

  mainButton: { marginTop: Spacing.lg },
  errorText: { fontSize: 14, color: Colors.error, textAlign: 'center' },

  progress: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  progressText: { fontSize: 13, color: Colors.textSecondary },
  progressDone: {
    fontSize: 14,
    color: Colors.primary,
    fontFamily: Fonts.handwriting,
  },
});
