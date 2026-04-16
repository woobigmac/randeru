import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList } from '../../navigation/HomeStackNavigator';
import { useActionStore } from '../../store/useActionStore';
import { Header } from '../../components/Header';
import { Tag } from '../../components/Tag';
import { Button } from '../../components/Button';
import { Colors, Fonts, Radius, Spacing } from '../../constants/theme';

type Props = {
  navigation: StackNavigationProp<HomeStackParamList, 'ActionDetail'>;
  route: RouteProp<HomeStackParamList, 'ActionDetail'>;
};

type TagColor = 'purple' | 'green' | 'orange' | 'gray';

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
};
const TONE_LABELS: Record<string, string> = {
  kind: '친절', sense: '감성', connect: '연결', environment: '환경',
};
const TONE_COLORS: Record<string, TagColor> = {
  kind: 'orange', sense: 'purple', connect: 'green', environment: 'gray',
};

export default function ActionDetailScreen({ navigation, route }: Props) {
  const { action } = route.params;
  const todayRecord = useActionStore((s) => s.todayRecord);

  return (
    <SafeAreaView style={styles.container}>
      <Header title="오늘의 액션" showBack />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* 제목 */}
        <Text style={styles.title}>{action.title}</Text>

        {/* 태그 행 */}
        <View style={styles.tagRow}>
          <Tag label={TONE_LABELS[action.category] ?? action.category} color={TONE_COLORS[action.category] ?? 'gray'} />
          <Tag label={DIFFICULTY_LABEL[action.difficulty] ?? action.difficulty} color="gray" />
          <Tag label={`${action.estimated_time}분`} color="purple" />
          <Tag label={`#${action.place_tag}`} color="green" />
        </View>

        {/* 설명 카드 */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>어떤 액션인가요?</Text>
          <Text style={styles.bodyText}>{action.description}</Text>
        </View>

        {/* 방법 카드 */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>어떻게 하면 되나요?</Text>
          <Text style={styles.bodyText}>
            {`1. 주변을 잠깐 둘러보세요.\n2. 지금 바로 실천할 수 있어요. 특별한 준비가 필요 없어요.\n3. 완료 후 사진 한 장을 찍어 기록해보세요.`}
          </Text>
        </View>

        {/* 안전 안내 */}
        {action.safety_note ? (
          <View style={styles.safetyCard}>
            <Text style={styles.safetyText}>⚠️ {action.safety_note}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* 하단 CTA */}
      <View style={styles.buttonArea}>
        <Button
          label="이 액션 시작하기"
          onPress={() => {
            if (todayRecord) {
              navigation.navigate('Photo', { recordId: todayRecord.record_id, action });
            }
          }}
          disabled={!todayRecord}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  title: {
    fontFamily: Fonts.handwriting,
    fontSize: 28,
    color: Colors.text,
    marginBottom: Spacing.md,
    lineHeight: 40,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bodyText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
  },
  safetyCard: {
    backgroundColor: '#FFF8EE',
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  safetyText: {
    fontSize: 13,
    color: Colors.error,
    lineHeight: 20,
  },
  buttonArea: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
});
