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
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useUserStore } from '../../store/useUserStore';
import { useRecordStore, RecordWithAction } from '../../store/useRecordStore';
import { RecordsStackParamList } from '../../navigation/RecordsStackNavigator';
import { MainTabParamList } from '../../navigation/MainTabNavigator';
import { TONES } from '../../constants';
import { Tone } from '../../types';

type RecordsNavProp = StackNavigationProp<RecordsStackParamList, 'RecordsList'>;

const ITEM_HEIGHT = 84;
const FILTER_OPTIONS: Array<{ id: 'all' | Tone; label: string }> = [
  { id: 'all', label: '전체' },
  ...TONES.map((t) => ({ id: t.id, label: t.label })),
];

const formatDate = (dateStr: string) => dateStr.replace(/-/g, '.');

export default function RecordsScreen() {
  const navigation = useNavigation<RecordsNavProp>();
  const tabNavigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  const user = useUserStore((s) => s.user);
  const { stats, isLoading, selectedFilter, loadRecords, setFilter, getFilteredRecords } =
    useRecordStore();

  useEffect(() => {
    if (user?.user_id) {
      loadRecords(user.user_id);
    }
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
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            height: ITEM_HEIGHT,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#f0f0f0',
          }}
        >
          {/* 썸네일 */}
          {record.photo_uploaded && record.photo_url ? (
            <Image
              source={{ uri: record.photo_url }}
              style={{ width: 60, height: 60, borderRadius: 8, marginRight: 12 }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 8,
                backgroundColor: '#f5f5f5',
                marginRight: 12,
              }}
            />
          )}

          {/* 텍스트 */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', marginBottom: 2 }} numberOfLines={1}>
              {action.title}
            </Text>
            <Text style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>
              {formatDate(record.action_date)}
            </Text>
            {record.memo ? (
              <Text style={{ fontSize: 12, color: '#555' }} numberOfLines={1}>
                {record.memo}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
    [navigation],
  );

  const renderEmpty = () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
      <Text style={{ fontSize: 16, color: '#888', marginBottom: 24 }}>아직 기록이 없어요</Text>
      <TouchableOpacity
        onPress={() => tabNavigation.navigate('HomeTab')}
        style={{ paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#000', borderRadius: 8 }}
      >
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
          오늘의 랜데루 — 뽑으러 가기
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {/* 상단 요약 */}
      <View style={{ padding: 20, paddingBottom: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 8 }}>기록</Text>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Text style={{ fontSize: 14, color: '#555' }}>
            누적 <Text style={{ fontWeight: 'bold', color: '#000' }}>{stats.totalCount}번</Text>
          </Text>
          <Text style={{ fontSize: 14, color: '#555' }}>
            {stats.streakDays > 0 ? (
              <>
                <Text style={{ fontWeight: 'bold', color: '#000' }}>{stats.streakDays}일</Text>{' '}
                연속
              </>
            ) : (
              '오늘 첫 번째 도전해봐요!'
            )}
          </Text>
        </View>
      </View>

      {/* 필터 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}
      >
        {FILTER_OPTIONS.map((opt) => {
          const isSelected = selectedFilter === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              onPress={() => setFilter(opt.id)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 14,
                borderRadius: 20,
                borderWidth: 1.5,
                borderColor: isSelected ? '#000' : '#ddd',
                backgroundColor: isSelected ? '#000' : '#fff',
              }}
            >
              <Text style={{ fontSize: 13, color: isSelected ? '#fff' : '#555', fontWeight: isSelected ? 'bold' : 'normal' }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 리스트 */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
