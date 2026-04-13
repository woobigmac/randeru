import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ListRenderItemInfo } from 'react-native';
import { TONES } from '../../constants';
import { Tone } from '../../types';
import { useUserStore } from '../../store/useUserStore';

type ToneItem = { id: Tone; label: string; description: string };

export default function ToneSelectScreen() {
  const [selectedTones, setSelectedTones] = useState<Tone[]>([]);
  const { setSelectedTones: saveToStore, completeOnboarding } = useUserStore();

  const toggleTone = (tone: Tone) => {
    setSelectedTones((prev) =>
      prev.includes(tone) ? prev.filter((t) => t !== tone) : [...prev, tone],
    );
  };

  const handleComplete = async () => {
    await saveToStore(selectedTones);
    await completeOnboarding();
    // isOnboardingComplete가 true로 바뀌면 RootNavigator가 자동으로 Main으로 전환
  };

  const renderItem = ({ item }: ListRenderItemInfo<ToneItem>) => {
    const isSelected = selectedTones.includes(item.id);
    return (
      <TouchableOpacity
        onPress={() => toggleTone(item.id)}
        style={{
          padding: 16,
          marginBottom: 12,
          borderWidth: 2,
          borderColor: isSelected ? '#000' : '#e0e0e0',
          borderRadius: 12,
          backgroundColor: isSelected ? '#f5f5f5' : '#fff',
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>
          {item.label}
        </Text>
        <Text style={{ fontSize: 13, color: '#666', lineHeight: 18 }}>
          {item.description}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={{ fontSize: 26, fontWeight: 'bold', marginBottom: 32 }}>
          어떤 느낌의 액션이 좋아요?
        </Text>

        <FlatList
          data={TONES}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          scrollEnabled={false}
        />
      </View>

      <TouchableOpacity
        onPress={handleComplete}
        style={{
          paddingVertical: 16,
          alignItems: 'center',
          backgroundColor: '#000',
          borderRadius: 8,
          marginBottom: 32,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
          {selectedTones.length === 0 ? '전체 랜덤으로 받기' : '오늘의 액션 받기'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
