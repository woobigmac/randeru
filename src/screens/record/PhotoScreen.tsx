import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Video, AVPlaybackStatus, ResizeMode } from 'expo-av';
import { uploadMedia, updateRecord } from '../../services/recordService';
import { completeReceivedActionShare } from '../../services/friendActionService';
import { useActionStore } from '../../store/useActionStore';
import { useUserStore } from '../../store/useUserStore';
import { MAX_VIDEO_DURATION } from '../../constants';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { Colors, Fonts, Radius, Spacing } from '../../constants/theme';
import { logActionCompleted } from '../../services/analyticsService';
import { trackActionActivity } from '../../services/actionActivityService';
import { Action, DailyRecord } from '../../types';

type PhotoStackParamList = {
  Photo: { recordId: string; action: Action; friendActionShareId?: string };
  Complete: { recordId: string; actionTitle?: string; source?: DailyRecord['source'] };
};

type Props = {
  navigation: StackNavigationProp<PhotoStackParamList, 'Photo'>;
  route: RouteProp<PhotoStackParamList, 'Photo'>;
};

const fmtSec = (secs: number) => {
  const s = Math.floor(secs);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

// ─── 영상 미리보기 ────────────────────────────────────────────────────────────
type VideoPreviewProps = { uri: string };

function VideoPreview({ uri }: VideoPreviewProps) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const isPlayingRef = useRef(false);

  const handleStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    const newPos = (status.positionMillis ?? 0) / 1000;
    const newDur = (status.durationMillis ?? 0) / 1000;
    const newPlaying = status.isPlaying;

    if (!isLoaded) setIsLoaded(true);

    // 값이 실제로 변경될 때만 setState
    if (Math.abs(newPos - positionRef.current) >= 0.5) {
      positionRef.current = newPos;
      setPosition(newPos);
    }
    if (newDur !== durationRef.current) {
      durationRef.current = newDur;
      setDuration(newDur);
    }
    if (newPlaying !== isPlayingRef.current) {
      isPlayingRef.current = newPlaying;
      setIsPlaying(newPlaying);
    }
  }, [isLoaded]);

  const togglePlay = async () => {
    if (isPlaying) {
      await videoRef.current?.pauseAsync();
    } else {
      await videoRef.current?.playAsync();
    }
  };

  return (
    <View style={vpStyles.wrapper}>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={vpStyles.video}
        resizeMode={ResizeMode.COVER}
        isLooping
        progressUpdateIntervalMillis={500}
        onPlaybackStatusUpdate={handleStatus}
      />
      {!isLoaded && (
        <View style={vpStyles.loadingOverlay}>
          <Text style={vpStyles.loadingText}>영상 로딩 중...</Text>
        </View>
      )}
      {/* 컨트롤 오버레이 */}
      <View style={vpStyles.overlay}>
        <TouchableOpacity onPress={togglePlay} style={vpStyles.playBtn} activeOpacity={0.8}>
          <Text style={vpStyles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
        </TouchableOpacity>
        <View style={vpStyles.timeRow}>
          <Text style={vpStyles.timeText}>
            {fmtSec(position)} / {fmtSec(Math.min(duration, MAX_VIDEO_DURATION))}
          </Text>
        </View>
      </View>
    </View>
  );
}

const vpStyles = StyleSheet.create({
  wrapper: { width: '100%', height: 300, borderRadius: Radius.lg, overflow: 'hidden', marginBottom: Spacing.md },
  video: { width: '100%', height: '100%' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { fontSize: 13, color: Colors.textTertiary },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: Spacing.md,
  },
  playBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  playIcon: { fontSize: 20, color: '#fff' },
  timeRow: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: Radius.sm,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  timeText: { fontSize: 12, color: '#fff', fontWeight: '600' },
});

// ─── 탭 바 ────────────────────────────────────────────────────────────────────
type TabBarProps = {
  activeTab: 'photo' | 'video';
  onChange: (tab: 'photo' | 'video') => void;
};

function TabBar({ activeTab, onChange }: TabBarProps) {
  return (
    <View style={tabStyles.row}>
      {(['photo', 'video'] as const).map((tab) => (
        <TouchableOpacity
          key={tab}
          onPress={() => onChange(tab)}
          style={[tabStyles.tab, activeTab === tab && tabStyles.tabActive]}
          activeOpacity={0.75}
        >
          <Text style={[tabStyles.label, activeTab === tab && tabStyles.labelActive]}>
            {tab === 'photo' ? '사진' : '영상'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    padding: 4,
    marginBottom: Spacing.md,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: Radius.full },
  tabActive: { backgroundColor: Colors.primary },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  labelActive: { color: Colors.white },
});

// ─── 메인 PhotoScreen ─────────────────────────────────────────────────────────
export default function PhotoScreen({ navigation, route }: Props) {
  const { recordId, action, friendActionShareId } = route.params;
  const { setActionCompleted } = useActionStore();
  const user = useUserStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<'photo' | 'video'>('photo');

  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [memo, setMemo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isMemoFocused, setIsMemoFocused] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // 탭 변경 시 미디어 초기화
  const handleTabChange = (tab: 'photo' | 'video') => {
    setActiveTab(tab);
    setMediaUri(null);
  };

  // ─── 사진 ──────────────────────────────────────────────────────────────────
  const pickPhotoFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('권한 필요', '갤러리 접근 권한이 필요해요.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setMediaUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('권한 필요', '카메라 접근 권한이 필요해요.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setMediaUri(result.assets[0].uri);
  };

  // ─── 영상 ──────────────────────────────────────────────────────────────────
  const pickVideoFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('권한 필요', '갤러리 접근 권한이 필요해요.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      videoMaxDuration: MAX_VIDEO_DURATION,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.duration && asset.duration > MAX_VIDEO_DURATION * 1000) {
        Alert.alert('영상이 너무 길어요', `영상은 최대 ${MAX_VIDEO_DURATION}초까지 가능해요.`);
        return;
      }
      setMediaUri(asset.uri);
    }
  };

  const recordVideo = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('권한 필요', '카메라 접근 권한이 필요해요.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      videoMaxDuration: MAX_VIDEO_DURATION,
    });
    if (!result.canceled) setMediaUri(result.assets[0].uri);
  };

  // ─── 저장 ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (isSaving) return;
    if (!mediaUri) {
      Alert.alert('미디어 필요', '사진 또는 영상을 먼저 추가해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      let mediaUrl: string | undefined;
      let thumbnailUrl: string | undefined;
      if (mediaUri && user?.user_id) {
        const uploaded = await uploadMedia(user.user_id, recordId, mediaUri, activeTab);
        mediaUrl = uploaded.url;
        thumbnailUrl = uploaded.thumbnailUrl;
      }
      const completedRecord: Partial<DailyRecord> = {
        status: 'completed',
        photo_uploaded: !!mediaUri, // 하위 호환
        ...(mediaUrl && activeTab === 'photo' && { photo_url: mediaUrl }), // 하위 호환
        ...(mediaUrl && { media_url: mediaUrl }),
        ...(mediaUrl && { media_type: activeTab }),
        ...(thumbnailUrl && { thumbnail_url: thumbnailUrl }),
        ...(memo.trim() && { memo: memo.trim() }),
        completed_at: new Date(),
      };
      await updateRecord(recordId, completedRecord);
      if (friendActionShareId) {
        if (!user) {
          throw new Error('로그인 정보가 필요해요.');
        }
        await completeReceivedActionShare(friendActionShareId, user);
      }
      setActionCompleted(completedRecord);
      logActionCompleted(action.action_id, action.category, !!mediaUri);
      trackActionActivity(user?.user_id, action, 'completed', {
        record_id: recordId,
        has_media: !!mediaUri,
        captured_media_type: activeTab,
        memo_written: !!memo.trim(),
      });
      navigation.navigate('Complete', {
        recordId,
        actionTitle: action.title,
        source: friendActionShareId ? 'friend_share' : 'daily',
      });
    } catch (e) {
      console.error('handleSave error:', e);
      Alert.alert('오류', '저장 중 문제가 발생했어요. 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── 렌더 ──────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={styles.container}>
        <Header title="사진 & 영상" showBack />
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TabBar activeTab={activeTab} onChange={handleTabChange} />

          {/* ── 사진 UI ── */}
          {activeTab === 'photo' && (
            <>
              {mediaUri ? (
                <Image source={{ uri: mediaUri }} style={styles.preview} resizeMode="cover" />
              ) : (
                <View style={styles.placeholder}>
                  <Text style={styles.placeholderText}>사진을 추가해보세요</Text>
                </View>
              )}
              <View style={styles.mediaButtons}>
                <Button label="카메라로 찍기" onPress={takePhoto} variant="secondary" style={styles.mediaBtn} />
                <Button label="갤러리에서 선택" onPress={pickPhotoFromGallery} variant="secondary" style={styles.mediaBtn} />
              </View>
            </>
          )}

          {/* ── 영상 UI ── */}
          {activeTab === 'video' && (
            <>
              {mediaUri ? (
                <VideoPreview uri={mediaUri} />
              ) : (
                <View style={styles.placeholder}>
                  <Text style={styles.placeholderText}>영상을 추가해보세요</Text>
                  <Text style={styles.placeholderSub}>최대 {MAX_VIDEO_DURATION}초</Text>
                </View>
              )}
              <View style={styles.mediaButtons}>
                <Button label="영상 촬영하기" onPress={recordVideo} variant="secondary" style={styles.mediaBtn} />
                <Button label="갤러리에서 선택" onPress={pickVideoFromGallery} variant="secondary" style={styles.mediaBtn} />
              </View>
            </>
          )}

          {/* 메모 */}
          <Text style={styles.memoLabel}>한 줄 메모 (선택)</Text>
          <TextInput
            value={memo}
            onChangeText={setMemo}
            onFocus={() => {
              setIsMemoFocused(true);
              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
            }}
            onBlur={() => setIsMemoFocused(false)}
            placeholder="오늘의 액션은 어땠나요?"
            placeholderTextColor={Colors.textTertiary}
            maxLength={100}
            multiline
            scrollEnabled={false}
            style={[styles.memoInput, isMemoFocused && styles.memoInputFocused]}
          />

          {/* 저장 버튼 */}
          <View style={styles.buttonArea}>
            <Button label="저장하기" onPress={handleSave} loading={isSaving} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  preview: { width: '100%', height: 300, borderRadius: Radius.lg, marginBottom: Spacing.md },
  placeholder: {
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
  placeholderText: { fontFamily: Fonts.handwriting, fontSize: 16, color: Colors.textTertiary },
  placeholderSub: { fontSize: 12, color: Colors.textTertiary, marginTop: Spacing.xs },
  mediaButtons: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  mediaBtn: { flex: 1 },
  memoLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600', marginBottom: Spacing.sm },
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
  buttonArea: { marginTop: Spacing.lg },
});
