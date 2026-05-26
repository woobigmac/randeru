import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useActionStore } from '../../store/useActionStore';
import { useRecordStore } from '../../store/useRecordStore';
import { useUserStore } from '../../store/useUserStore';
import { Button } from '../../components/Button';
import { TouchableOpacity } from 'react-native';
import { Colors, Fonts, Radius, Spacing } from '../../constants/theme';
import { Action, DailyRecord } from '../../types';

type CompleteStackParamList = {
  Complete: { recordId: string; actionTitle?: string; source?: DailyRecord['source'] };
  Share: { record: DailyRecord; action: Action };
};

type Props = {
  navigation: StackNavigationProp<CompleteStackParamList, 'Complete'>;
  route: RouteProp<CompleteStackParamList, 'Complete'>;
};

function ShareButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.shareButton}>
      <Text style={styles.shareButtonText}>공유하기</Text>
    </TouchableOpacity>
  );
}

export default function CompleteScreen({ navigation, route }: Props) {
  const { todayAction, todayRecord } = useActionStore();
  const user = useUserStore((s) => s.user);
  const { stats, loadRecords } = useRecordStore();
  const isFriendAction = route.params.source === 'friend_share';
  const completedActionTitle = isFriendAction
    ? route.params.actionTitle
    : todayAction?.title ?? route.params.actionTitle;

  useEffect(() => {
    // 완료 후 최신 통계 로드
    if (user?.user_id) loadRecords(user.user_id);
  }, []);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.inner}>
        {/* 완료 메시지 */}
        <View style={styles.topArea}>
          <Text style={styles.title}>오늘도{'\n'}해냈어요!</Text>
          <Text style={styles.subtitle}>
            {completedActionTitle ?? '훌륭한 액션'}{'\n'}
            {isFriendAction ? '친구와 함께 완료했어요' : '을 완료했어요'}
          </Text>
        </View>

        {/* 통계 카드 */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalCount}</Text>
            <Text style={styles.statLabel}>누적 액션</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.streakDays}</Text>
            <Text style={styles.statLabel}>일 연속</Text>
          </View>
        </View>

        {/* 버튼 */}
        <View style={styles.buttonArea}>
          {todayRecord && todayAction && (
            <ShareButton
              onPress={() =>
                navigation.navigate('Share', {
                  record: todayRecord,
                  action: todayAction,
                })
              }
            />
          )}
          <Button
            label="기록만 남기기"
            onPress={() => navigation.popToTop()}
            variant="text"
            style={styles.skipButton}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  inner: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
  },
  topArea: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.handwriting,
    fontSize: 48,
    color: Colors.white,
    marginBottom: Spacing.md,
    lineHeight: 60,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 28,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Fonts.handwriting,
    fontSize: 32,
    color: Colors.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  buttonArea: {
    gap: Spacing.sm,
  },
  shareButton: {
    height: 52,
    borderRadius: Radius.full,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  skipButton: {
    alignSelf: 'center',
  },
});
