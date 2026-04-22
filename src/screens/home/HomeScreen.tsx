import React, { useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useUserStore } from '../../store/useUserStore';
import { useActionStore } from '../../store/useActionStore';
import { useRecordStore } from '../../store/useRecordStore';
import { HomeStackParamList } from '../../navigation/HomeStackNavigator';
import { MainTabParamList } from '../../navigation/MainTabNavigator';
import { MAX_RESHUFFLE_COUNT, FREE_RESHUFFLE_COUNT } from '../../constants';
import { logActionReceived, logActionAccepted, logReshuffle } from '../../services/analyticsService';
import { useActionStore as useActionStoreRaw } from '../../store/useActionStore';
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
    todayAction,
    todayRecord,
    actionStatus,
    isLoading,
    error,
    loadTodayAction,
    receiveAction,
    reshuffleAction,
    reshuffleWithAd,
  } = useActionStore();
  const streakDays = useRecordStore((s) => s.stats.streakDays);

  useEffect(() => {
    if (user?.user_id) loadTodayAction(user.user_id);
  }, [user?.user_id]);

  const reshuffleCount = todayRecord?.reshuffle_count ?? 0;
  const isFreeAvailable = reshuffleCount < FREE_RESHUFFLE_COUNT;
  const isAdAvailable = reshuffleCount >= FREE_RESHUFFLE_COUNT && reshuffleCount < MAX_RESHUFFLE_COUNT;
  const isExhausted = reshuffleCount >= MAX_RESHUFFLE_COUNT;

  const handleReceiveAction = async () => {
    if (!user) return;
    await receiveAction(user.user_id, user.selected_tones);
    const received = useActionStoreRaw.getState().todayAction;
    if (received) {
      logActionReceived(received.action_id, received.category);
      logActionAccepted(received.action_id, received.category);
    }
  };

  const reshuffleLabel = isFreeAvailable
    ? `다른 액션 보기 (${FREE_RESHUFFLE_COUNT - reshuffleCount}회 남음)`
    : isAdAvailable
    ? '광고 보고 한 번 더 뽑기'
    : '오늘 재추첨을 모두 사용했어요';

  const handleReshuffle = () => {
    if (!user || isExhausted) return;

    if (isAdAvailable) {
      Alert.alert(
        '추가 재추첨',
        '무료 재추첨을 모두 사용했어요.\n짧은 광고를 보면 1회 더 뽑을 수 있어요!',
        [
          { text: '괜찮아요', style: 'cancel' },
          {
            text: '광고 보고 뽑기',
            onPress: () => {
              logReshuffle(reshuffleCount, true);
              reshuffleWithAd(user.user_id);
            },
          },
        ],
      );
      return;
    }

    logReshuffle(reshuffleCount, false);
    reshuffleAction(user.user_id);
  };

  // ─── 로딩 ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // ─── 에러 ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            label="다시 시도"
            onPress={() => user?.user_id && loadTodayAction(user.user_id)}
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
        <View>
          <Text style={styles.greeting}>
            {user?.nickname ? `${user.nickname}님,` : '안녕하세요,'}
          </Text>
          <Text style={styles.date}>{getTodayStr()}</Text>
        </View>

        {/* 연속 수행일 배지 */}
        {streakDays > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>{streakDays}일 연속 🔥</Text>
          </View>
        )}
      </View>

      {/* ─── not_received ─────────────────────────────────────────────────── */}
      {actionStatus === 'not_received' && (
        <View style={styles.body}>
          <View style={styles.dashedCard}>
            <Text style={styles.dashedTitle}>오늘의 액션을{'\n'}뽑아보세요</Text>
            <Text style={styles.dashedSub}>매일 하나, 인간다운 행동</Text>
          </View>
          <Button
            label="오늘의 액션 뽑기"
            onPress={handleReceiveAction}
            style={styles.mainButton}
          />
        </View>
      )}

      {/* ─── accepted ─────────────────────────────────────────────────────── */}
      {actionStatus === 'accepted' && todayAction && (
        <View style={styles.body}>
          <ActionCard
            action={todayAction}
            status="accepted"
            onPress={() => navigation.navigate('ActionDetail', { action: todayAction })}
          />
          <Button
            label={reshuffleLabel}
            onPress={handleReshuffle}
            variant="text"
            disabled={isExhausted}
            style={{ marginTop: Spacing.lg }}
          />
          <Button
            label="자세히 보기"
            onPress={() => navigation.navigate('ActionDetail', { action: todayAction })}
            style={styles.mainButton}
          />
        </View>
      )}

      {/* ─── completed / shared ───────────────────────────────────────────── */}
      {(actionStatus === 'completed' || actionStatus === 'shared') && todayAction && (
        <View style={styles.body}>
          <ActionCard
            action={todayAction}
            status="completed"
            onPress={() => {}}
          />
          <Button
            label="기록 보기"
            onPress={() => navigation.navigate('Records')}
            variant="secondary"
            style={styles.mainButton}
          />
          {actionStatus !== 'shared' && todayRecord && (
            <Button
              label="공유하기"
              onPress={() =>
                navigation.navigate('Share', { record: todayRecord, action: todayAction })
              }
              style={{ marginTop: Spacing.sm }}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  greeting: {
    fontFamily: Fonts.handwriting,
    fontSize: 24,
    color: Colors.text,
  },
  date: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  streakBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  streakText: {
    fontSize: 12,
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
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
  dashedSub: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  mainButton: {
    marginTop: Spacing.lg,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
  },
});
