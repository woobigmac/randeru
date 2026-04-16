import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { useUserStore } from '../../store/useUserStore';
import { Button } from '../../components/Button';
import { Colors, Fonts, Radius, Spacing } from '../../constants/theme';

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
  const [isFocused, setIsFocused] = useState(false);
  const setNicknameStore = useUserStore((state) => state.setNickname);

  const handleChange = (value: string) => {
    setNickname(value);
    setError(validate(value));
  };

  const handleNext = async () => {
    const err = validate(nickname);
    if (err) { setError(err); return; }
    await setNicknameStore(nickname.trim());
    navigation.navigate('ToneSelect');
  };

  const isValid = nickname.length >= 2 && validate(nickname) === '';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>어떻게 불러드릴까요?</Text>
          <Text style={styles.subtitle}>실제 이름이 아니어도 괜찮아요</Text>

          <TextInput
            value={nickname}
            onChangeText={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="닉네임 입력"
            placeholderTextColor={Colors.textTertiary}
            maxLength={10}
            autoFocus
            style={[
              styles.input,
              isFocused && styles.inputFocused,
              !!error && styles.inputError,
            ]}
          />
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
        </View>

        <View style={styles.buttonArea}>
          <Button label="다음" onPress={handleNext} disabled={!isValid} />
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
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
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.handwriting,
    fontSize: 28,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 18,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  inputFocused: {
    borderColor: Colors.primary,
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  buttonArea: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
});
