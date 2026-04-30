import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { useUserStore } from '../../store/useUserStore';
import { MyPageStackParamList } from '../../navigation/MyPageStackNavigator';
import { APP_VERSION } from '../../constants';
import { Colors, Fonts, Radius, Spacing } from '../../constants/theme';

const INQUIRY_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyCB5LeZfwVlXx13EaZE_RiPLxwoQehSh85yi70rDKoOjqoLE0eiRgLgb47TrNmgueQZg/exec';

const CATEGORIES = [
  { id: 'bug', label: '버그/오류 신고' },
  { id: 'feature', label: '기능 제안' },
  { id: 'account', label: '계정 관련' },
  { id: 'etc', label: '기타' },
] as const;

type CategoryId = (typeof CATEGORIES)[number]['id'];

type Props = {
  navigation: StackNavigationProp<MyPageStackParamList, 'Inquiry'>;
};

export default function InquiryScreen({ navigation }: Props) {
  const user = useUserStore((s) => s.user);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('bug');
  const [content, setContent] = useState('');
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);

  const isValid = content.trim().length >= 10;

  const handleSubmit = async () => {
    if (!isValid || isSending) return;
    setIsSending(true);
    try {
      const res = await fetch(INQUIRY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: user?.nickname ?? '알 수 없음',
          category: CATEGORIES.find((c) => c.id === selectedCategory)?.label,
          content: content.trim(),
          email: email.trim(),
          appVersion: APP_VERSION,
        }),
      });
      if (!res.ok) throw new Error('server error');
      Alert.alert('문의가 접수됐어요', '빠르게 답변드릴게요!', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('전송에 실패했어요', '잠시 후 다시 시도해주세요.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 문의 유형 */}
          <Text style={styles.sectionLabel}>문의 유형</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id)}
                style={[styles.categoryBtn, selectedCategory === cat.id && styles.categoryBtnSelected]}
                activeOpacity={0.75}
              >
                <Text style={[styles.categoryText, selectedCategory === cat.id && styles.categoryTextSelected]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 문의 내용 */}
          <Text style={styles.sectionLabel}>문의 내용</Text>
          <View style={styles.textAreaWrap}>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="문의 내용을 자세히 적어주세요"
              placeholderTextColor={Colors.textTertiary}
              multiline
              maxLength={500}
              style={styles.textArea}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{content.length}/500</Text>
          </View>

          {/* 이메일 */}
          <Text style={styles.sectionLabel}>
            연락받을 이메일{' '}
            <Text style={styles.optional}>(선택)</Text>
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="답변받을 이메일 주소 (선택)"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          {/* 제출 버튼 */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!isValid || isSending}
            style={[styles.submitBtn, (!isValid || isSending) && styles.submitBtnDisabled]}
            activeOpacity={0.8}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.submitText}>문의 보내기</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: 48 },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  optional: { fontWeight: '400', textTransform: 'none', letterSpacing: 0 },

  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  categoryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  categoryBtnSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  categoryText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  categoryTextSelected: { color: Colors.primary, fontWeight: '600' },

  textAreaWrap: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  textArea: {
    fontSize: 15,
    color: Colors.text,
    minHeight: 140,
    lineHeight: 22,
  },
  charCount: { fontSize: 12, color: Colors.textTertiary, textAlign: 'right', marginTop: 4 },

  input: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
    color: Colors.text,
  },

  submitBtn: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: {
    fontFamily: Fonts.handwriting,
    fontSize: 17,
    color: Colors.white,
  },
});
