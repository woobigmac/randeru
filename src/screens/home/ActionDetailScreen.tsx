import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList } from '../../navigation/HomeStackNavigator';
import { useActionStore } from '../../store/useActionStore';

type Props = {
  navigation: StackNavigationProp<HomeStackParamList, 'ActionDetail'>;
  route: RouteProp<HomeStackParamList, 'ActionDetail'>;
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
};

export default function ActionDetailScreen({ navigation, route }: Props) {
  const { action } = route.params;
  const todayRecord = useActionStore((s) => s.todayRecord);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
      {/* 뒤로가기 */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 24, marginTop: 16 }}>
        <Text style={{ fontSize: 14, color: '#888' }}>← 뒤로</Text>
      </TouchableOpacity>

      {/* 제목 */}
      <Text style={{ fontSize: 26, fontWeight: 'bold', marginBottom: 8 }}>
        {action.title}
      </Text>

      {/* 감성 한 줄 설명 */}
      <Text style={{ fontSize: 15, color: '#666', marginBottom: 32, lineHeight: 22 }}>
        {action.description}
      </Text>

      {/* 태그 행 */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 32 }}>
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#ddd', borderRadius: 20 }}>
          <Text style={{ fontSize: 12, color: '#555' }}>
            난이도: {DIFFICULTY_LABEL[action.difficulty] ?? action.difficulty}
          </Text>
        </View>
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#ddd', borderRadius: 20 }}>
          <Text style={{ fontSize: 12, color: '#555' }}>
            약 {action.estimated_time}분
          </Text>
        </View>
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#ddd', borderRadius: 20 }}>
          <Text style={{ fontSize: 12, color: '#555' }}>
            #{action.place_tag}
          </Text>
        </View>
      </View>

      {/* 왜 이 액션인가요? */}
      <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
        왜 이 액션인가요?
      </Text>
      <Text style={{ fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 32 }}>
        {action.description}
      </Text>

      {/* 어떻게 하면 되나요? */}
      <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
        어떻게 하면 되나요?
      </Text>
      <Text style={{ fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 32 }}>
        {`1. 주변을 잠깐 둘러보세요.\n2. 지금 바로 실천할 수 있어요. 특별한 준비가 필요 없어요.\n3. 완료 후 사진 한 장을 찍어 기록해보세요.`}
      </Text>

      {/* 안전 안내 (있을 때만) */}
      {action.safety_note ? (
        <View
          style={{
            padding: 14,
            backgroundColor: '#fffbea',
            borderLeftWidth: 3,
            borderLeftColor: '#f6c90e',
            borderRadius: 4,
            marginBottom: 32,
          }}
        >
          <Text style={{ fontSize: 13, color: '#7a6600', lineHeight: 20 }}>
            ⚠️ {action.safety_note}
          </Text>
        </View>
      ) : null}

      {/* CTA */}
      <TouchableOpacity
        onPress={() => {
          if (todayRecord) {
            navigation.navigate('Photo', { recordId: todayRecord.record_id });
          }
        }}
        style={{
          paddingVertical: 16,
          alignItems: 'center',
          backgroundColor: '#000',
          borderRadius: 8,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
          이 액션 시작하기
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
