import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  ListRenderItemInfo,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import { useUserStore } from '../../store/useUserStore';
import { MyPageStackParamList } from '../../navigation/MyPageStackNavigator';
import { MIN_AGE, MAX_AGE } from '../../constants';
import { Colors, Fonts, Radius, Spacing } from '../../constants/theme';

type Props = {
  navigation: StackNavigationProp<MyPageStackParamList, 'ProfileEdit'>;
};

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const AGES = Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => MIN_AGE + i);
const NICKNAME_REGEX = /^[가-힣a-zA-Z0-9]{2,10}$/;

export default function ProfileEditScreen({ navigation }: Props) {
  const { user, updateProfile } = useUserStore();

  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [selectedAge, setSelectedAge] = useState(user?.age ?? 20);
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const initialIndex = Math.max(0, (user?.age ?? 20) - MIN_AGE);

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

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(index, AGES.length - 1));
      setSelectedAge(AGES[clamped]);
    },
    [],
  );

  const handleSave = async () => {
    const trimmed = nickname.trim();
    if (!NICKNAME_REGEX.test(trimmed)) {
      Alert.alert('유효하지 않은 닉네임', '2~10자, 한글/영문/숫자만 사용 가능해요.');
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile({
        nickname: trimmed,
        age: selectedAge,
        imageUri,
      });
      Alert.alert('저장됐어요', '', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('오류', '저장 중 문제가 발생했어요.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderAgeItem = useCallback(
    ({ item }: ListRenderItemInfo<number>) => {
      const diff = Math.abs(item - selectedAge);
      const opacity = diff === 0 ? 1 : diff === 1 ? 0.5 : 0.25;
      const fontSize = diff === 0 ? 26 : diff === 1 ? 18 : 14;
      const color = diff === 0 ? Colors.primary : Colors.text;
      return (
        <View style={ageStyles.item}>
          <Text style={{ opacity, fontSize, color, fontFamily: Fonts.handwriting }}>
            {item}세
          </Text>
        </View>
      );
    },
    [selectedAge],
  );

  const profileImageSource = imageUri
    ? { uri: imageUri }
    : user?.profileImage
    ? { uri: user.profileImage }
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 정보 수정</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving} style={styles.saveBtn}>
          {isSaving ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Text style={styles.saveText}>저장</Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={[null]}
        keyExtractor={() => 'body'}
        renderItem={() => (
          <View style={styles.body}>
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

            {/* 나이 피커 */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>나이</Text>
              <View style={ageStyles.pickerWrapper}>
                <View style={ageStyles.selectionLine} pointerEvents="none" />
                <FlatList
                  ref={flatListRef}
                  data={AGES}
                  keyExtractor={(item) => String(item)}
                  renderItem={renderAgeItem}
                  getItemLayout={(_, index) => ({
                    length: ITEM_HEIGHT,
                    offset: ITEM_HEIGHT * index,
                    index,
                  })}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  initialScrollIndex={initialIndex}
                  onMomentumScrollEnd={handleScrollEnd}
                  onScrollEndDrag={handleScrollEnd}
                  contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
                  style={ageStyles.flatList}
                />
              </View>
            </View>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { minWidth: 60 },
  backText: { fontSize: 16, color: Colors.primary },
  headerTitle: { fontFamily: Fonts.handwriting, fontSize: 18, color: Colors.text },
  saveBtn: { minWidth: 60, alignItems: 'flex-end' },
  saveText: { fontSize: 16, fontWeight: '600', color: Colors.primary },

  body: { padding: Spacing.lg, paddingBottom: Spacing.xxl },

  avatarSection: { alignItems: 'center', marginBottom: Spacing.xl },
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

  section: { marginBottom: Spacing.xl },
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
  },
  inputHint: { fontSize: 12, color: Colors.textTertiary, marginTop: 4 },
});

const ageStyles = StyleSheet.create({
  pickerWrapper: {
    height: PICKER_HEIGHT,
    overflow: 'hidden',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
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
  flatList: { flex: 1 },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
