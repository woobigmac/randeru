import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  SectionListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useUserStore } from '../../store/useUserStore';
import { useRecordStore, RecordWithAction } from '../../store/useRecordStore';
import { RecordsStackParamList } from '../../navigation/RecordsStackNavigator';
import { MainTabParamList } from '../../navigation/MainTabNavigator';
import { TONES, DAILY_SLOTS } from '../../constants';
import { Colors, Fonts, Radius, Spacing } from '../../constants/theme';
import { EmptyState } from '../../components/EmptyState';
import { Tone, SlotId } from '../../types';

type RecordsNavProp = StackNavigationProp<RecordsStackParamList, 'RecordsList'>;

const FILTER_OPTIONS: Array<{ id: 'all' | Tone; label: string }> = [
  { id: 'all', label: '전체' },
  ...TONES.map((t) => ({ id: t.id, label: t.label })),
];

const formatDate = (d: string) => d.replace(/-/g, '.');

const SLOT_LABEL: Record<SlotId, string> = { morning: '아침', lunch: '점심', evening: '저녁' };

interface DateSection {
  date: string;
  data: RecordWithAction[];
}

function groupByDate(records: RecordWithAction[]): DateSection[] {
  const map: Record<string, RecordWithAction[]> = {};
  for (const item of records) {
    const d = item.record.action_date;
    if (!map[d]) map[d] = [];
    map[d].push(item);
  }
  return Object.keys(map)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({ date, data: map[date] }));
}

function getCompletedSlots(items: RecordWithAction[]): SlotId[] {
  return items.map((i) => (i.record.slot_id ?? 'morning') as SlotId);
}

export default function RecordsScreen() {
  const navigation = useNavigation<RecordsNavProp>();
  const tabNavigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const user = useUserStore((s) => s.user);
  const { stats, isLoading, selectedFilter, loadRecords, setFilter, getFilteredRecords } =
    useRecordStore();

  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user?.user_id) loadRecords(user.user_id);
  }, [user?.user_id]);

  const filteredRecords = getFilteredRecords();
  const sections = groupByDate(filteredRecords);

  const toggleDate = useCallback((date: string) => {
    setCollapsedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }, []);

  const renderSectionHeader = useCallback(
    ({ section }: { section: DateSection }) => {
      const isCollapsed = collapsedDates.has(section.date);
      const completedSlots = getCompletedSlots(section.data);
      return (
        <TouchableOpacity
          onPress={() => toggleDate(section.date)}
          activeOpacity={0.75}
          style={styles.sectionHeader}
        >
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionDate}>{formatDate(section.date)}</Text>
            <View style={styles.slotPillRow}>
              {DAILY_SLOTS.map((slot) => {
                const done = completedSlots.includes(slot.id);
                return (
                  <View
                    key={slot.id}
                    style={[styles.slotPill, done && styles.slotPillDone]}
                  >
                    <Text style={[styles.slotPillText, done && styles.slotPillTextDone]}>
                      {slot.label}{done ? '✓' : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
          <Text style={styles.collapseArrow}>{isCollapsed ? '›' : '⌄'}</Text>
        </TouchableOpacity>
      );
    },
    [collapsedDates, toggleDate],
  );

  const renderItem = useCallback(
    ({ item, section }: SectionListRenderItemInfo<RecordWithAction, DateSection>) => {
      if (collapsedDates.has(section.date)) return null;
      const { record, action } = item;
      const slotId = (record.slot_id ?? 'morning') as SlotId;
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
            <View style={styles.itemTopRow}>
              <View style={styles.slotTag}>
                <Text style={styles.slotTagText}>{SLOT_LABEL[slotId]}</Text>
              </View>
              <Text style={styles.itemTitle} numberOfLines={1}>{action.title}</Text>
            </View>
            {record.memo ? (
              <Text style={styles.itemMemo} numberOfLines={1}>{record.memo}</Text>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
    [navigation, collapsedDates],
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
      ) : sections.length === 0 ? (
        <EmptyState
          message="아직 기록이 없어요"
          ctaLabel="오늘의 랜데루 — 뽑으러 가기"
          onCtaPress={() => tabNavigation.navigate('HomeTab')}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.record.record_id}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  pageTitle: { fontFamily: Fonts.handwriting, fontSize: 28, color: Colors.text },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: { fontFamily: Fonts.handwriting, fontSize: 28, color: Colors.primary, marginBottom: 2 },
  statLabel: { fontSize: 12, color: Colors.textSecondary },

  filterRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.md },
  filterPill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: Radius.full, backgroundColor: Colors.surface },
  filterPillSelected: { backgroundColor: Colors.primary },
  filterText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  filterTextSelected: { color: Colors.white, fontWeight: '600' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionHeaderLeft: { flex: 1 },
  sectionDate: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  slotPillRow: { flexDirection: 'row', gap: 4 },
  slotPill: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  slotPillDone: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  slotPillText: { fontSize: 11, color: Colors.textTertiary },
  slotPillTextDone: { color: Colors.primaryDark, fontWeight: '600' },
  collapseArrow: { fontSize: 18, color: Colors.textTertiary, marginLeft: Spacing.sm },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    minHeight: 72,
  },
  thumbnail: { width: 60, height: 60, borderRadius: Radius.sm, marginRight: Spacing.md },
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
  itemTopRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 4 },
  slotTag: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryLight,
  },
  slotTagText: { fontSize: 10, color: Colors.primaryDark, fontWeight: '600' },
  itemTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text },
  itemMemo: { fontSize: 12, color: Colors.textSecondary },
});
