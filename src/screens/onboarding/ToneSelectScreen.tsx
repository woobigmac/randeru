import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TONES } from '../../constants';
import { Colors, Fonts, Radius, Spacing } from '../../constants/theme';
import { Tone } from '../../types';
import { useUserStore } from '../../store/useUserStore';
import { Button } from '../../components/Button';
import {
  requestPermission,
  scheduleDailyNotification,
  registerPushToken,
} from '../../services/notificationService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.lg * 2 - Spacing.sm) / 2;

export default function ToneSelectScreen() {
  const [selectedTones, setSelectedTones] = useState<Tone[]>([]);
  const { user, setSelectedTones: saveToStore, completeOnboarding } = useUserStore();

  const toggleTone = (tone: Tone) => {
    setSelectedTones((prev) =>
      prev.includes(tone) ? prev.filter((t) => t !== tone) : [...prev, tone],
    );
  };

  const handleComplete = async () => {
    await saveToStore(selectedTones);
    await completeOnboarding();

    // 온보딩 완료 후 알림 초기화 (실패해도 앱 진입은 계속)
    const userId = useUserStore.getState().user?.user_id ?? user?.user_id;
    const granted = await requestPermission();
    if (granted) {
      await scheduleDailyNotification('09:00');
    }
    if (userId) {
      await registerPushToken(userId);
    }
    // isOnboardingComplete가 true로 바뀌면 RootNavigator가 자동으로 Main으로 전환
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>어떤 느낌의{'\n'}액션이 좋아요?</Text>
        <Text style={styles.subtitle}>여러 개 선택 가능해요</Text>

        {/* 2x2 그리드 */}
        <View style={styles.grid}>
          {TONES.map((item) => {
            const isSelected = selectedTones.includes(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => toggleTone(item.id)}
                activeOpacity={0.8}
                style={[
                  styles.card,
                  isSelected ? styles.cardSelected : styles.cardDefault,
                ]}
              >
                <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}>
                  {item.label}
                </Text>
                <Text style={styles.cardDesc} numberOfLines={3}>
                  {item.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.buttonArea}>
        <Button
          label={selectedTones.length === 0 ? '전체 랜덤으로 받기' : '오늘의 액션 받기'}
          onPress={handleComplete}
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
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.handwriting,
    fontSize: 28,
    color: Colors.text,
    marginBottom: Spacing.sm,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: Radius.md,
    padding: Spacing.md,
    minHeight: 130,
    borderWidth: 1.5,
  },
  cardDefault: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  cardSelected: {
    backgroundColor: Colors.white,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  cardTitleSelected: {
    color: Colors.primary,
  },
  cardDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  buttonArea: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
});
