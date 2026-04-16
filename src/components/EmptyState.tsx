import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from './Button';
import { Colors, Spacing } from '../constants/theme';

type Props = {
  message: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
};

export function EmptyState({ message, ctaLabel, onCtaPress }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {ctaLabel && onCtaPress && (
        <Button
          label={ctaLabel}
          onPress={onCtaPress}
          variant="secondary"
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
  },
  message: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },
  button: {
    paddingHorizontal: Spacing.xl,
  },
});
