import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Colors, Radius } from '../constants/theme';

type Variant = 'primary' | 'secondary' | 'text';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: Props) {
  const isText = variant === 'text';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        !isText && styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        isText && styles.textVariant,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? Colors.white : Colors.primary}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'primary' && styles.primaryLabel,
            variant === 'secondary' && styles.secondaryLabel,
            isText && styles.textLabel,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: Radius.full,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textVariant: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryLabel: {
    color: Colors.white,
  },
  secondaryLabel: {
    color: Colors.primary,
  },
  textLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
