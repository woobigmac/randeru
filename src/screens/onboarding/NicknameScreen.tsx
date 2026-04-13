import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { useUserStore } from '../../store/useUserStore';

type Props = {
  navigation: StackNavigationProp<OnboardingStackParamList, 'Nickname'>;
};

const NICKNAME_REGEX = /^[a-zA-Z0-9가-힣]+$/;

function validate(value: string): string {
  if (value.length === 0) return '';
  if (value.length < 2) return '2자 이상 입력해주세요';
  if (value.length > 10) return '10자 이하로 입력해주세요';
  if (!NICKNAME_REGEX.test(value)) return '영문, 한글, 숫자만 사용 가능해요';
  return '';
}

export default function NicknameScreen({ navigation }: Props) {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const setNicknameStore = useUserStore((state) => state.setNickname);

  const handleChange = (value: string) => {
    setNickname(value);
    setError(validate(value));
  };

  const handleNext = async () => {
    const validationError = validate(nickname);
    if (validationError) {
      setError(validationError);
      return;
    }
    await setNicknameStore(nickname);
    navigation.navigate('ToneSelect');
  };

  const isValid = nickname.length >= 2 && validate(nickname) === '';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <Text style={{ fontSize: 26, fontWeight: 'bold', marginBottom: 8 }}>
          어떻게 불러드릴까요?
        </Text>
        <Text style={{ fontSize: 14, color: '#888', marginBottom: 40 }}>
          실제 이름이 아니어도 괜찮아요
        </Text>

        <TextInput
          value={nickname}
          onChangeText={handleChange}
          placeholder="닉네임 입력"
          maxLength={10}
          autoFocus
          style={{
            borderBottomWidth: 1.5,
            borderBottomColor: error ? '#e53e3e' : '#000',
            paddingVertical: 8,
            fontSize: 20,
            marginBottom: 8,
          }}
        />
        {error ? (
          <Text style={{ color: '#e53e3e', fontSize: 12, marginTop: 4 }}>{error}</Text>
        ) : null}

        <TouchableOpacity
          onPress={handleNext}
          disabled={!isValid}
          style={{
            marginTop: 48,
            paddingVertical: 16,
            alignItems: 'center',
            backgroundColor: isValid ? '#000' : '#d0d0d0',
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>다음</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
