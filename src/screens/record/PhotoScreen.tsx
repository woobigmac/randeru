import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { HomeStackParamList } from '../../navigation/HomeStackNavigator';
import { storage } from '../../services/firebase';
import { updateRecord } from '../../services/recordService';
import { useActionStore } from '../../store/useActionStore';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { Colors, Fonts, Radius, Spacing } from '../../constants/theme';

type Props = {
  navigation: StackNavigationProp<HomeStackParamList, 'Photo'>;
  route: RouteProp<HomeStackParamList, 'Photo'>;
};

async function uploadPhotoAsync(uri: string, recordId: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, `records/${recordId}.jpg`);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

export default function PhotoScreen({ navigation, route }: Props) {
  const { recordId } = route.params;
  const { setActionCompleted } = useActionStore();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [memo, setMemo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isMemoFocused, setIsMemoFocused] = useState(false);

  const pickFromGallery = async () => {
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
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const takeFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '카메라 접근 권한이 필요해요.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let photoUrl: string | undefined;
      if (photoUri) {
        photoUrl = await uploadPhotoAsync(photoUri, recordId);
      }
      await updateRecord(recordId, {
        status: 'completed',
        photo_uploaded: !!photoUri,
        ...(photoUrl && { photo_url: photoUrl }),
        ...(memo.trim() && { memo: memo.trim() }),
        completed_at: new Date(),
      });
      setActionCompleted();
      navigation.navigate('Complete', { recordId });
    } catch (e) {
      console.error('handleSave error:', e);
      Alert.alert('오류', '저장 중 문제가 발생했어요. 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    setIsSaving(true);
    try {
      await updateRecord(recordId, {
        status: 'completed',
        photo_uploaded: false,
        completed_at: new Date(),
      });
      setActionCompleted();
      navigation.navigate('Complete', { recordId });
    } catch (e) {
      console.error('handleSkip error:', e);
      Alert.alert('오류', '저장 중 문제가 발생했어요.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
        <Header title="사진 & 기록" showBack />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* 사진 미리보기 */}
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>사진을 추가해보세요</Text>
            </View>
          )}

          {/* 카메라 / 갤러리 */}
          <View style={styles.photoButtons}>
            <Button
              label="카메라"
              onPress={takeFromCamera}
              variant="secondary"
              style={styles.photoBtn}
            />
            <Button
              label="갤러리"
              onPress={pickFromGallery}
              variant="secondary"
              style={styles.photoBtn}
            />
          </View>

          {/* 메모 입력 */}
          <Text style={styles.memoLabel}>한 줄 메모 (선택)</Text>
          <TextInput
            value={memo}
            onChangeText={setMemo}
            onFocus={() => setIsMemoFocused(true)}
            onBlur={() => setIsMemoFocused(false)}
            placeholder="오늘의 액션은 어땠나요?"
            placeholderTextColor={Colors.textTertiary}
            maxLength={100}
            multiline
            style={[styles.memoInput, isMemoFocused && styles.memoInputFocused]}
          />
        </ScrollView>

        {/* 하단 고정 */}
        <View style={styles.buttonArea}>
          <Button label="저장하기" onPress={handleSave} loading={isSaving} />
          <Button
            label="사진 없이 기록만 남기기"
            onPress={handleSkip}
            variant="text"
            disabled={isSaving}
            style={{ marginTop: Spacing.md }}
          />
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.md },
  preview: {
    width: '100%',
    height: 300,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  photoPlaceholder: {
    width: '100%',
    height: 300,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  photoPlaceholderText: {
    fontFamily: Fonts.handwriting,
    fontSize: 16,
    color: Colors.textTertiary,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  photoBtn: { flex: 1 },
  memoLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  memoInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  memoInputFocused: { borderColor: Colors.primary },
  buttonArea: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
});
