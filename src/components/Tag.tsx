import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Radius } from '../constants/theme';

type TagColor = 'purple' | 'green' | 'orange' | 'gray';

type Props = {
  label: string;
  color?: TagColor;
};

const COLOR_MAP: Record<TagColor, { bg: string; fg: string }> = {
  purple: { bg: '#EDE8F5', fg: '#7C6FD8' },
  green:  { bg: '#E8F5EE', fg: '#2D5A3D' },
  orange: { bg: '#FAF0E8', fg: '#C45E28' },
  gray:   { bg: '#F0EEF5', fg: '#7B6EA0' },
};

export function Tag({ label, color = 'gray' }: Props) {
  const { bg, fg } = COLOR_MAP[color];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: Radius.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
});
