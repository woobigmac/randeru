import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { Button } from '../../components/Button';
import { Colors, Fonts, Radius, Spacing } from '../../constants/theme';

type Props = {
  navigation: StackNavigationProp<OnboardingStackParamList, 'Onboarding'>;
};

type Slide = { id: string; title: string; description: string };

const { width } = Dimensions.get('window');

const SLIDES: Slide[] = [
  {
    id: '1',
    title: '오늘의 액션이\n도착했어요',
    description: '매일 하나의 인간다운 액션을\n랜덤으로 받아보세요',
  },
  {
    id: '2',
    title: '해보고, 남기고',
    description: '행동 후 사진 한 장과 짧은 기록으로\n남길 수 있어요',
  },
  {
    id: '3',
    title: '공유는 가볍게',
    description: '인스타, 스레드, 카카오톡으로\n가볍게 공유해보세요',
  },
];

export default function OnboardingScreen({ navigation }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);

  const goToNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
    } else {
      navigation.navigate('Nickname');
    }
  };

  const renderItem = ({ item }: ListRenderItemInfo<Slide>) => (
    <View style={styles.slide}>
      <View style={styles.card}>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideDesc}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 건너뛰기 */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Nickname')}
        style={styles.skipButton}
      >
        <Text style={styles.skipText}>건너뛰기</Text>
      </TouchableOpacity>

      {/* 슬라이드 */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />

      {/* 인디케이터 */}
      <View style={styles.indicatorRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === currentIndex ? Colors.primary : Colors.primaryLight },
              i === currentIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* 다음 / 시작하기 */}
      <View style={styles.buttonArea}>
        <Button
          label={currentIndex === SLIDES.length - 1 ? '시작하기' : '다음'}
          onPress={goToNext}
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
  skipButton: {
    position: 'absolute',
    top: 56,
    right: Spacing.lg,
    zIndex: 10,
    padding: Spacing.sm,
  },
  skipText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  slideTitle: {
    fontFamily: Fonts.handwriting,
    fontSize: 28,
    color: Colors.primaryDark,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 40,
  },
  slideDesc: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
  },
  dotActive: {
    width: 20,
  },
  buttonArea: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
});
