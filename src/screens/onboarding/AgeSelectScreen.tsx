import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ListRenderItemInfo,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors, Fonts, Spacing } from '../../constants/theme';
import { MIN_AGE, MAX_AGE } from '../../constants';
import { useUserStore } from '../../store/useUserStore';
import { registerPushToken } from '../../services/notificationService';
import { Button } from '../../components/Button';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';

const ITEM_HEIGHT = 56;
const VISIBLE_ITEMS = 5; // 위2 + 선택1 + 아래2
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const DEFAULT_AGE = 20;

const AGES = Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => MIN_AGE + i);

type Props = {
  navigation: StackNavigationProp<OnboardingStackParamList, 'AgeSelect'>;
};

export default function AgeSelectScreen({ navigation }: Props) {
  const { setAge, completeOnboarding, user } = useUserStore();
  const [selectedAge, setSelectedAge] = useState(DEFAULT_AGE);
  const flatListRef = useRef<FlatList>(null);
  const initialIndex = DEFAULT_AGE - MIN_AGE;

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(index, AGES.length - 1));
      setSelectedAge(AGES[clamped]);
    },
    [],
  );

  const handleComplete = async () => {
    await setAge(selectedAge);
    await completeOnboarding();
    if (user?.user_id) {
      registerPushToken(user.user_id).catch(() => {});
    }
    // RootNavigator가 isOnboardingComplete 변경을 감지해 홈으로 자동 전환
  };

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<number>) => {
      const diff = Math.abs(item - selectedAge);
      const opacity = diff === 0 ? 1 : diff === 1 ? 0.6 : 0.3;
      const fontSize = diff === 0 ? 32 : diff === 1 ? 22 : 16;
      const color = diff === 0 ? Colors.primary : Colors.text;
      const fontWeight = diff === 0 ? '700' : '400';

      return (
        <View key={index} style={styles.item}>
          <Text style={[styles.ageText, { opacity, fontSize, color, fontWeight }]}>
            {item}세
          </Text>
        </View>
      );
    },
    [selectedAge],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<number> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>나이가{'\n'}어떻게 되세요?</Text>
        <Text style={styles.subtitle}>나이에 맞는 액션을 추천해드릴게요</Text>

        {/* 피커 영역 */}
        <View style={styles.pickerWrapper}>
          {/* 선택 강조 선 */}
          <View style={styles.selectionLine} pointerEvents="none" />

          <FlatList
            ref={flatListRef}
            data={AGES}
            keyExtractor={(item) => String(item)}
            renderItem={renderItem}
            getItemLayout={getItemLayout}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            initialScrollIndex={initialIndex}
            onMomentumScrollEnd={handleScrollEnd}
            onScrollEndDrag={handleScrollEnd}
            contentContainerStyle={{
              paddingVertical: ITEM_HEIGHT * 2, // 위아래 여백으로 첫/마지막 값 중앙 정렬
            }}
            style={styles.flatList}
          />
        </View>
      </View>

      <View style={styles.buttonArea}>
        <Button label="시작하기" onPress={handleComplete} />
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
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
  pickerWrapper: {
    height: PICKER_HEIGHT,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  selectionLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_HEIGHT * 2,
    height: ITEM_HEIGHT,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: Colors.primary,
    zIndex: 1,
  },
  flatList: {
    flex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageText: {
    fontFamily: Fonts.handwriting,
  },
  buttonArea: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
});
