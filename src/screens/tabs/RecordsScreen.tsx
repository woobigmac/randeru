import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  ListRenderItemInfo,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useUserStore } from '../../store/useUserStore';
import { useRecordStore, RecordWithAction } from '../../store/useRecordStore';
import { RecordsStackParamList } from '../../navigation/RecordsStackNavigator';
import { MainTabParamList } from '../../navigation/MainTabNavigator';
import { TONES } from '../../constants';
import { Colors, Fonts, Radius, Spacing } from '../../constants/theme';
import { EmptyState } from '../../components/EmptyState';
import { Tone } from '../../types';

type RecordsNavProp = StackNavigationProp<RecordsStackParamList, 'RecordsList'>;

const ITEM_HEIGHT = 88;
const FILTER_OPTIONS: Array<{ id: 'all' | Tone; label: string }> = [
  { id: 'all', label: '전체' },
  ...TONES.map((t) => ({ id: t.id, label: t.label })),
];
const formatDate = (d: string) => d.replace(/-/g, '.');

export default function RecordsScreen() {
  const navigation = useNavigation<RecordsNavProp>();
  const tabNavigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const user = useUserStore((s) => s.user);
  const { stats, isLoading, selectedFilter, loadRecords, setFilter, getFilteredRecords } =
    useRecordStore();

  useEffect(() => {
    if (user?.user_id) loadRecords(user.user_id);
  }, [user?.user_id]);

  const filteredRecords = getFilteredRecords();

  const keyExtractor = useCallback((item: RecordWithAction) => item.record.record_id, []);
  const getItemLayout = useCallback(
    (_: ArrayLike<RecordWithAction> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<RecordWithAction>) => {
      const { record, action } = item;
      return (
        <TouchableOpacity
          onPress={() => navigation.navigate('RecordDetail', { record, action })}
          style={styles.item}
          activeOpacity={0.75}
        >
          {record.media_url || record.photo_url ? (
            <View>
              <Image
                source={{ uri: record.thumbnail_url ?? record.media_url ?? record.photo_url }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
              {record.media_type === 'video' && (
                <View style={styles.videoIcon}>
                  <Text style={styles.videoIconText}>▶</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.thumbnailPlaceholder} />
          )}
          <View style={styles.itemText}>
            <Text style={styles.itemTitle} numberOfLines={1}>{action.title}</Text>
            <Text style={styles.itemDate}>{formatDate(record.action_date)}</Text>
            {record.memo ? (
              <Text style={styles.itemMemo} numberOfLines={1}>{record.memo}</Text>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
    [navigation],
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 타이틀 */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>기록</Text>
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

      {/* 필터 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTER_OPTIONS.map((opt) => {
          const isSelected = selectedFilter === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              onPress={() => setFilter(opt.id)}
              style={[styles.filterPill, isSelected && styles.filterPillSelected]}
            >
              <Text style={[styles.filterText, isSelected && styles.filterTextSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 리스트 */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={filteredRecords.length === 0 ? { flex: 1 } : undefined}
          ListEmptyComponent={
            <EmptyState
              message="아직 기록이 없어요"
              ctaLabel="오늘의 랜데루 — 뽑으러 가기"
              onCtaPress={() => tabNavigation.navigate('HomeTab')}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  pageTitle: {
    fontFamily: Fonts.handwriting,
    fontSize: 28,
    color: Colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Fonts.handwriting,
    fontSize: 28,
    color: Colors.primary,
    marginBottom: 2,
  },
  statLabel: { fontSize: 12, color: Colors.textSecondary },
  filterRow: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
  },
  filterPillSelected: { backgroundColor: Colors.primary },
  filterText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  filterTextSelected: { color: Colors.white, fontWeight: '600' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ITEM_HEIGHT,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: Radius.sm,
    marginRight: Spacing.md,
  },
  videoIcon: {
    position: 'absolute',
    bottom: 3,
    right: Spacing.md + 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoIconText: { fontSize: 8, color: '#fff' },
  thumbnailPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    marginRight: Spacing.md,
  },
  itemText: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  itemDate: { fontSize: 12, color: Colors.textTertiary, marginBottom: 2 },
  itemMemo: { fontSize: 12, color: Colors.textSecondary },
});
