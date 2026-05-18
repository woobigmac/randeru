import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import {
  DEFAULT_NOTIFICATION_SLOTS,
  requestPermission,
  scheduleDailySlotNotifications,
  setInitialNotificationOptIn,
  setInitialNotificationPromptSeen,
} from '../../services/notificationService';
import { Colors, Fonts, Radius, Spacing } from '../../constants/theme';

type Props = {
  onComplete: () => void;
};

export default function NotificationPermissionScreen({ onComplete }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const finish = async (enabled: boolean) => {
    await setInitialNotificationPromptSeen();
    await setInitialNotificationOptIn(enabled);
    onComplete();
  };

  const handleAllow = async () => {
    setIsLoading(true);
    try {
      const granted = await requestPermission({ showSettingsAlert: false });
      if (granted) {
        await scheduleDailySlotNotifications(DEFAULT_NOTIFICATION_SLOTS);
      }
      await finish(granted);
    } catch (e) {
      console.warn('initial notification permission error:', e);
      await finish(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      await finish(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Text style={styles.iconText}>알람</Text>
        </View>

        <Text style={styles.title}>
          알람 설정을 해주시면{'\n'}매일 소소한 액션을 보내드릴게요
        </Text>
      </View>

      <View style={styles.buttonArea}>
        <Button
          label="알람 설정하기"
          onPress={handleAllow}
          loading={isLoading}
          disabled={isLoading}
        />
        <Button
          label="나중에"
          onPress={handleSkip}
          variant="text"
          disabled={isLoading}
          style={styles.skipButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  iconText: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  title: {
    fontFamily: Fonts.handwriting,
    fontSize: 28,
    lineHeight: 40,
    color: Colors.text,
    textAlign: 'center',
  },
  buttonArea: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  skipButton: {
    marginTop: Spacing.md,
  },
});
