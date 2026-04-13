import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ListRenderItemInfo,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';

type Props = {
  navigation: StackNavigationProp<OnboardingStackParamList, 'Onboarding'>;
};

type Slide = {
  id: string;
  title: string;
  description: string;
};

const { width } = Dimensions.get('window');

const SLIDES: Slide[] = [
  {
    id: '1',
    title: '오늘의 액션이 도착했어요',
    description: '매일 하나의 인간다운 액션을 랜덤으로 받아보세요',
  },
  {
    id: '2',
    title: '해보고, 남기고',
    description: '행동 후 사진 한 장과 짧은 기록으로 남길 수 있어요',
  },
  {
    id: '3',
    title: '공유는 가볍게',
    description: '인스타, 스레드, 카카오톡으로 가볍게 공유해보세요',
  },
];

export default function OnboardingScreen({ navigation }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);

  const goToNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      navigation.navigate('Nickname');
    }
  };

  const renderItem = ({ item }: ListRenderItemInfo<Slide>) => (
    <View
      style={{
        width,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
      }}
    >
      <Text
        style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }}
      >
        {item.title}
      </Text>
      <Text style={{ fontSize: 16, textAlign: 'center', color: '#666' }}>
        {item.description}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {/* 건너뛰기 */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Nickname')}
        style={{ position: 'absolute', top: 60, right: 24, zIndex: 10 }}
      >
        <Text style={{ fontSize: 14, color: '#888' }}>건너뛰기</Text>
      </TouchableOpacity>

      {/* 슬라이드 */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        scrollEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />

      {/* 인디케이터 */}
      <View
        style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 24 }}
      >
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i === currentIndex ? '#000' : '#ccc',
              marginHorizontal: 4,
            }}
          />
        ))}
      </View>

      {/* 다음 / 시작하기 버튼 */}
      <TouchableOpacity
        onPress={goToNext}
        style={{
          alignItems: 'center',
          paddingVertical: 16,
          marginHorizontal: 24,
          marginBottom: 48,
          backgroundColor: '#000',
          borderRadius: 8,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
          {currentIndex === SLIDES.length - 1 ? '시작하기' : '다음'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
