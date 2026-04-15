import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useUserStore } from '../../store/useUserStore';
import { useActionStore } from '../../store/useActionStore';
import { HomeStackParamList } from '../../navigation/HomeStackNavigator';
import { MainTabParamList } from '../../navigation/MainTabNavigator';
import { MAX_RESHUFFLE_COUNT } from '../../constants';

type HomeNavigationProp = CompositeNavigationProp<
  StackNavigationProp<HomeStackParamList, 'Home'>,
  BottomTabNavigationProp<MainTabParamList>
>;

type Props = { navigation: HomeNavigationProp };

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
  } = useActionStore();

  useEffect(() => {
    if (user?.user_id) {
      loadTodayAction(user.user_id);
    }
  }, [user?.user_id]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: '#e53e3e', marginBottom: 16 }}>{error}</Text>
        <TouchableOpacity
          onPress={() => user?.user_id && loadTodayAction(user.user_id)}
          style={{ padding: 12, backgroundColor: '#000', borderRadius: 8 }}
        >
          <Text style={{ color: '#fff' }}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── not_received ────────────────────────────────────────────────────────────
  if (actionStatus === 'not_received') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 12 }}>
          오늘은 이런 행동 어때요?
        </Text>
        <Text style={{ fontSize: 14, color: '#888', marginBottom: 48 }}>
          매일 하나의 액션을 랜덤으로 받아보세요
        </Text>
        <TouchableOpacity
          onPress={() =>
            user && receiveAction(user.user_id, user.selected_tones)
          }
          style={{
            paddingVertical: 16,
            paddingHorizontal: 40,
            backgroundColor: '#000',
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
            오늘의 액션 뽑기
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── completed / shared ───────────────────────────────────────────────────────
  if (actionStatus === 'completed' || actionStatus === 'shared') {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 24 }}>
          오늘도 해냈어요! 🎉
        </Text>

        {/* 완료된 액션 카드 (흐리게) */}
        {todayAction && (
          <View
            style={{
              padding: 20,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#e0e0e0',
              backgroundColor: '#fafafa',
              opacity: 0.6,
              marginBottom: 24,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
              {todayAction.title}
            </Text>
            <Text style={{ fontSize: 14, color: '#666' }}>{todayAction.description}</Text>
            <Text style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
              #{todayAction.place_tag} · {todayAction.difficulty}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={() => navigation.navigate('Records')}
          style={{
            paddingVertical: 14,
            alignItems: 'center',
            borderWidth: 1.5,
            borderColor: '#000',
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: 'bold' }}>기록 보기</Text>
        </TouchableOpacity>

        {actionStatus !== 'shared' && todayRecord && todayAction && (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('Share', {
                record: todayRecord,
                action: todayAction,
              })
            }
            style={{
              paddingVertical: 14,
              alignItems: 'center',
              backgroundColor: '#000',
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>
              공유하기
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ─── accepted ─────────────────────────────────────────────────────────────────
  const remainingReshuffle = MAX_RESHUFFLE_COUNT - (todayRecord?.reshuffle_count ?? 0);
  const canReshuffle = remainingReshuffle > 0;

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 24 }}>
        오늘의 액션이 기다리고 있어요
      </Text>

      {/* 액션 카드 */}
      {todayAction && (
        <View
          style={{
            padding: 20,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: '#000',
            marginBottom: 24,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>
            {todayAction.title}
          </Text>
          <Text style={{ fontSize: 14, color: '#555', marginBottom: 12 }}>
            {todayAction.description}
          </Text>
          <Text style={{ fontSize: 12, color: '#888' }}>
            #{todayAction.place_tag} · {todayAction.difficulty} · {todayAction.estimated_time}분
          </Text>
        </View>
      )}

      {/* 재추첨 버튼 */}
      <TouchableOpacity
        onPress={() => user && reshuffleAction(user.user_id)}
        disabled={!canReshuffle}
        style={{
          paddingVertical: 12,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: canReshuffle ? '#000' : '#ccc',
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        <Text style={{ color: canReshuffle ? '#000' : '#aaa', fontSize: 14 }}>
          {canReshuffle
            ? `다른 액션 보기 (남은 횟수: ${remainingReshuffle}회)`
            : '재추첨 횟수를 모두 사용했어요'}
        </Text>
      </TouchableOpacity>

      {/* 자세히 보기 */}
      {todayAction && (
        <TouchableOpacity
          onPress={() => navigation.navigate('ActionDetail', { action: todayAction })}
          style={{
            paddingVertical: 16,
            alignItems: 'center',
            backgroundColor: '#000',
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
            자세히 보기
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
