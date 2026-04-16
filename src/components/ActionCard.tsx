import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Action } from '../types';
import { Tag } from './Tag';
import { Colors, Fonts, Radius, Spacing } from '../constants/theme';

type TagColor = 'purple' | 'green' | 'orange' | 'gray';
type Status = 'not_received' | 'accepted' | 'completed';

type Props = {
  action: Action;
  status?: Status;
  onPress: () => void;
};

const TONE_LABELS: Record<string, string> = {
  kind: '친절',
  sense: '감성',
  connect: '연결',
  environment: '환경',
};

const TONE_COLORS: Record<string, TagColor> = {
  kind: 'orange',
  sense: 'purple',
  connect: 'green',
  environment: 'gray',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
};

export function ActionCard({ action, status = 'accepted', onPress }: Props) {
  const isCompleted = status === 'completed';
  const toneColor = TONE_COLORS[action.category] ?? 'gray';
  const toneLabel = TONE_LABELS[action.category] ?? action.category;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, isCompleted && styles.completed]}
    >
      {/* 카테고리 태그 */}
      <View style={styles.tagRow}>
        <Tag label={toneLabel} color={toneColor} />
        {isCompleted && (
          <View style={styles.checkBadge}>
            <Text style={styles.checkText}>✓ 완료</Text>
          </View>
        )}
      </View>

      {/* 액션 제목 */}
      <Text style={styles.title} numberOfLines={2}>
        {action.title}
      </Text>

      {/* 메타 태그 행 */}
      <View style={styles.metaRow}>
        <MetaPill label={DIFFICULTY_LABELS[action.difficulty] ?? action.difficulty} />
        <MetaPill label={`${action.estimated_time}분`} />
        <MetaPill label={`#${action.place_tag}`} />
      </View>
    </TouchableOpacity>
  );
}

function MetaPill({ label }: { label: string }) {
  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  completed: {
    opacity: 0.5,
  },
  tagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  checkBadge: {
    backgroundColor: '#E8F5EE',
    borderRadius: Radius.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  checkText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
  },
  title: {
    fontFamily: Fonts.handwriting,
    fontSize: 22,
    color: Colors.text,
    marginBottom: Spacing.md,
    lineHeight: 32,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  metaPill: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
