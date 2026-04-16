import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing } from '../constants/theme';

type Props = {
  title: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
};

export function Header({ title, showBack = false, rightElement }: Props) {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.right}>
        {rightElement ?? null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.background,
  },
  left: {
    width: 40,
    alignItems: 'flex-start',
  },
  right: {
    width: 40,
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '500',
    color: Colors.text,
  },
  back: {
    fontSize: 22,
    color: Colors.textSecondary,
  },
});
