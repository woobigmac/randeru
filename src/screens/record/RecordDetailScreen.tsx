import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RecordsStackParamList } from '../../navigation/RecordsStackNavigator';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { Tag } from '../../components/Tag';
import { Colors, Fonts, Radius, Spacing } from '../../constants/theme';

type Props = {
  navigation: StackNavigationProp<RecordsStackParamList, 'RecordDetail'>;
  route: RouteProp<RecordsStackParamList, 'RecordDetail'>;
};

type TagColor = 'purple' | 'green' | 'orange' | 'gray';
const TONE_COLORS: Record<string, TagColor> = {
  kind: 'orange', sense: 'purple', connect: 'green', environment: 'gray',
};
const TONE_LABELS: Record<string, string> = {
  kind: '친절', sense: '감성', connect: '연결', environment: '환경',
};
const formatDate = (d: string) => d.replace(/-/g, '.');

export default function RecordDetailScreen({ navigation, route }: Props) {
  const { record, action } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <Header title={formatDate(record.action_date)} showBack />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 미디어 */}
        {record.media_type === 'video' && record.media_url ? (
          <Video
            source={{ uri: record.media_url }}
            style={styles.photo}
            resizeMode={ResizeMode.COVER}
            useNativeControls
            isLooping
            shouldPlay
          />
        ) : record.media_url || record.photo_url ? (
          <Image
            source={{ uri: record.media_url ?? record.photo_url }}
            style={styles.photo}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>미디어 없음</Text>
          </View>
        )}

        {/* 카테고리 태그 */}
        <View style={styles.tagRow}>
          <Tag
            label={TONE_LABELS[action.category] ?? action.category}
            color={TONE_COLORS[action.category] ?? 'gray'}
          />
        </View>

        {/* 액션 제목 */}
        <Text style={styles.title}>{action.title}</Text>

        {/* 메모 */}
        {record.memo ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>메모</Text>
            <Text style={styles.memoText}>{record.memo}</Text>
          </View>
        ) : null}

        {/* 공유 문구 */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>공유 문구</Text>
          <Text style={styles.copyText}>{action.share_copy_template}</Text>
        </View>
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={styles.buttonArea}>
        <Button
          label="다시 공유하기"
          onPress={() => navigation.navigate('Share', { record, action })}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: Spacing.xxl },
  photo: { width: '100%', height: 280 },
  photoPlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontFamily: Fonts.handwriting,
    fontSize: 15,
    color: Colors.textTertiary,
  },
  tagRow: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  title: {
    fontFamily: Fonts.handwriting,
    fontSize: 26,
    color: Colors.text,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    lineHeight: 38,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memoText: { fontSize: 15, color: Colors.text, lineHeight: 24, fontStyle: 'italic' },
  copyText: { fontSize: 14, color: Colors.text, lineHeight: 22 },
  buttonArea: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
});
