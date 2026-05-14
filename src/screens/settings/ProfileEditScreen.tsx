import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import { useUserStore } from '../../store/useUserStore';
import { MyPageStackParamList } from '../../navigation/MyPageStackNavigator';
import { logProfileUpdated } from '../../services/analyticsService';
import { Colors, Fonts, Radius, Spacing } from '../../constants/theme';

type Gender = 'male' | 'female' | null;

type Props = {
  navigation: StackNavigationProp<MyPageStackParamList, 'ProfileEdit'>;
};

const NICKNAME_REGEX = /^[가-힣a-zA-Z0-9]{2,10}$/;

export default function ProfileEditScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useUserStore();

  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [selectedGender, setSelectedGender] = useState<Gender>(user?.gender ?? null);
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요해요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    const trimmed = nickname.trim();
    if (!NICKNAME_REGEX.test(trimmed)) {
      Alert.alert('유효하지 않은 닉네임', '2~10자, 한글/영문/숫자만 사용 가능해요.');
      return;
    }
    setIsSaving(true);
    try {
      const updatedFields: string[] = [];
      if (trimmed !== user?.nickname) updatedFields.push('nickname');
      if (selectedGender !== user?.gender) updatedFields.push('gender');
      if (imageUri) updatedFields.push('profileImage');

      await updateProfile({
        nickname: trimmed,
        gender: selectedGender,
        imageUri,
      });

      logProfileUpdated(updatedFields, !!(imageUri ?? user?.profileImage));

      Alert.alert('저장됐어요', '', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('오류', '저장 중 문제가 발생했어요.');
    } finally {
      setIsSaving(false);
    }
  };

  const profileImageSource = imageUri
    ? { uri: imageUri }
    : user?.profileImage
    ? { uri: user.profileImage }
    : null;

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerSide}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 정보 수정</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving} style={[styles.headerSide, styles.headerRight]}>
          {isSaving ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Text style={styles.saveText}>저장</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 프로필 사진 */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8}>
            {profileImageSource ? (
              <Image source={profileImageSource} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>👤</Text>
              </View>
            )}
            <View style={styles.cameraOverlay}>
              <Text style={styles.cameraIcon}>📷</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePickImage} style={{ marginTop: Spacing.sm }}>
            <Text style={styles.changePhotoText}>사진 변경</Text>
          </TouchableOpacity>
        </View>

        {/* 닉네임 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>닉네임</Text>
          <TextInput
            value={nickname}
            onChangeText={setNickname}
            style={styles.input}
            placeholder="닉네임 입력 (2~10자)"
            placeholderTextColor={Colors.textTertiary}
            maxLength={10}
            autoCorrect={false}
          />
          <Text style={styles.inputHint}>한글/영문/숫자만 사용 가능해요</Text>
        </View>

        {/* 성별 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>성별</Text>
          <View style={styles.genderRow}>
            {(['male', 'female'] as const).map((g) => {
              const selected = selectedGender === g;
              return (
                <TouchableOpacity
                  key={g}
                  onPress={() => setSelectedGender(g)}
                  activeOpacity={0.75}
                  style={[styles.genderBtn, selected && styles.genderBtnSelected]}
                >
                  <Text style={[styles.genderLabel, selected && styles.genderLabelSelected]}>
                    {g === 'male' ? '남자' : '여자'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  headerSide: { minWidth: 60 },
  headerRight: { alignItems: 'flex-end' },
  backText: { fontSize: 16, color: Colors.primary },
  headerTitle: { fontFamily: Fonts.handwriting, fontSize: 18, color: Colors.text },
  saveText: { fontSize: 16, fontWeight: '600', color: Colors.primary },

  body: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },

  avatarSection: { alignItems: 'center', marginBottom: Spacing.lg, height: 120, justifyContent: 'center' },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: { fontSize: 40 },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: { fontSize: 14 },
  changePhotoText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },

  section: { marginBottom: Spacing.md },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.white,
    height: 48,
  },
  inputHint: { fontSize: 12, color: Colors.textTertiary, marginTop: 4 },

  genderRow: { flexDirection: 'row', gap: Spacing.sm },
  genderBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderBtnSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  genderLabel: { fontSize: 15, fontWeight: '500', color: Colors.textSecondary },
  genderLabelSelected: { color: Colors.white, fontWeight: '600' },
});
