import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { useActionStore } from '../../store/useActionStore';
import { markAsShared } from '../../services/recordService';
import { showRewardedAd } from '../../services/adService';
import { logActionShared } from '../../services/analyticsService';
import { trackActionActivity } from '../../services/actionActivityService';
import { DailyRecord, Action } from '../../types';
import { Colors, Fonts, Radius, Spacing } from '../../constants/theme';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';

type ShareRouteParams = { record: DailyRecord; action: Action };
type Props = {
  navigation: StackNavigationProp<Record<string, ShareRouteParams | undefined>, string>;
  route: RouteProp<{ Share: ShareRouteParams }, 'Share'>;
};

const SHARE_HASHTAGS = '#랜데루 #오늘의인간다움 #하루한번작은행동';
const APP_ICON = require('../../../assets/icon.png');
const INSTAGRAM_URL = 'instagram://app';
const INSTAGRAM_STORIES_URL = 'instagram-stories://share';

type DateLike = Date | string | { toDate: () => Date } | undefined;

function toSafeDate(date: DateLike): Date | null {
  if (!date) return null;
  if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
  if (typeof date === 'string') {
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  try {
    const parsed = date.toDate();
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

// ─── 아날로그 카메라 타임스탬프 포맷 ────────────────────────────────────────
function formatTimestamp(date: DateLike): string {
  const d = toSafeDate(date);
  if (!d) return '';
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yy}.${mm}.${dd}  ${hh}:${min}`;
}

// ─── 공유 카드 ──────────────────────────────────────────────────────────────
type ShareCardProps = {
  title: string;
  copyTemplate: string;
  memo?: string;
  mediaUrl?: string;
  mediaType?: 'photo' | 'video';
  completedAt?: DateLike;
  onImageLoaded?: () => void;
};

const ShareCard = React.forwardRef<ViewShot, ShareCardProps>(
  ({ title, copyTemplate, memo, mediaUrl, mediaType, completedAt, onImageLoaded }, ref) => {
    const [imageError, setImageError] = useState(false);
    const showImage = !!mediaUrl && !imageError;
    const timestamp = formatTimestamp(completedAt);

    return (
      <ViewShot ref={ref} options={{ format: 'jpg', quality: 0.95 }}>
        <View style={cardStyles.card}>
          {/* 1. 사용자 사진 */}
          {showImage ? (
            <View style={{ position: 'relative', marginBottom: Spacing.md }}>
              <Image
                source={{ uri: mediaUrl }}
                style={cardStyles.photo}
                resizeMode="cover"
                onLoadEnd={onImageLoaded}
                onError={() => {
                  setImageError(true);
                  onImageLoaded?.();
                }}
              />
              {mediaType === 'video' && (
                <View style={cardStyles.videoBadge}>
                  <Text style={cardStyles.videoBadgeText}>영상</Text>
                </View>
              )}
            </View>
          ) : (
            // 이미지 없거나 로드 실패 시 onImageLoaded 즉시 호출
            <ImmediateCallback onMount={onImageLoaded} />
          )}

          {/* 2. 느낀점 메모 */}
          {!!memo && (
            <Text style={cardStyles.memo}>{`"${memo}"`}</Text>
          )}

          {/* 3. 액션 제목 */}
          <Text style={cardStyles.title}>{title}</Text>

          {/* 4. share_copy_template */}
          <Text style={cardStyles.copy}>{copyTemplate}</Text>
          <Text style={cardStyles.hashtag}>{SHARE_HASHTAGS}</Text>

          {/* 5. 워터마크 + 타임스탬프 */}
          <View style={cardStyles.bottomRow}>
            <View style={cardStyles.watermarkRow}>
              <Image source={APP_ICON} style={cardStyles.watermarkIcon} />
              <Text style={cardStyles.watermarkText}>랜데루</Text>
            </View>
            {!!timestamp && (
              <Text style={cardStyles.timestamp}>{timestamp}</Text>
            )}
          </View>
        </View>
      </ViewShot>
    );
  },
);

/** 이미지 없을 때 mount 즉시 콜백 실행 */
function ImmediateCallback({ onMount }: { onMount?: () => void }) {
  React.useEffect(() => {
    onMount?.();
  }, []);
  return null;
}

const cardStyles = StyleSheet.create({
  card: {
    width: 320,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    padding: Spacing.lg,
  },
  photo: { width: '100%', height: 200, borderRadius: Radius.md },
  videoBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: Radius.sm,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  videoBadgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  memo: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.handwriting,
    fontSize: 18,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  copy: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  hashtag: { fontSize: 12, color: Colors.textTertiary, marginBottom: Spacing.md },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  watermarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  watermarkIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  watermarkText: {
    fontFamily: Fonts.handwriting,
    fontSize: 12,
    color: Colors.textTertiary,
  },
  timestamp: {
    fontSize: 11,
    color: '#E8871E',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    letterSpacing: 1.2,
  },
});

// ─── 공유 버튼 카드 ──────────────────────────────────────────────────────────
function ShareOptionCard({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[optStyles.card, disabled && optStyles.disabled]}
    >
      <Text style={optStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const optStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabled: { opacity: 0.4 },
  label: { fontSize: 15, fontWeight: '600', color: Colors.text },
});

// ─── 메인 ShareScreen ────────────────────────────────────────────────────────
export default function ShareScreen({ navigation, route }: Props) {
  const { record, action } = route.params;
  const { todayRecord, setActionShared } = useActionStore();
  const cardRef = useRef<ViewShot>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const isMounted = useRef(true);

  React.useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const mediaUrl = record.media_url ?? record.photo_url;
  // 영상인 경우 카드 미리보기에는 썸네일 이미지를 사용
  const cardPreviewUrl = record.media_type === 'video'
    ? (record.thumbnail_url && record.thumbnail_url !== record.media_url ? record.thumbnail_url : undefined)
    : mediaUrl;

  /** 이미지 로드 완료 혹은 이미지 없음 시 호출 */
  const handleImageLoaded = () => setImageReady(true);

  /** 이미지가 준비될 때까지 대기 후 캡처 */
  const captureCard = (): Promise<string> =>
    new Promise((resolve, reject) => {
      const tryCapture = async () => {
        if (!isMounted.current) { reject(new Error('unmounted')); return; }
        try {
          if (!cardRef.current) {
            reject(new Error('share_card_not_ready'));
            return;
          }
          const uri = await captureRef(cardRef.current, {
            format: 'jpg',
            quality: 0.95,
            result: 'tmpfile',
          });
          resolve(uri);
        } catch (e) {
          reject(e);
        }
      };

      if (imageReady || !mediaUrl) {
        tryCapture();
      } else {
        // 최대 3초 대기
        let waited = 0;
        const interval = setInterval(() => {
          if (!isMounted.current) { clearInterval(interval); reject(new Error('unmounted')); return; }
          waited += 100;
          if (imageReady || !mediaUrl || waited >= 3000) {
            clearInterval(interval);
            tryCapture();
          }
        }, 100);
      }
    });

  const requestLibraryPermission = async (): Promise<boolean> => {
    const permission = await MediaLibrary.requestPermissionsAsync(false);
    const granted =
      permission.status === 'granted' ||
      (permission as MediaLibrary.PermissionResponse & { accessPrivileges?: string })
        .accessPrivileges === 'limited';
    if (!granted) {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요해요.');
    }
    return granted;
  };

  // 갤러리 저장: 항상 카드 스냅샷 이미지로 저장
  const saveToLibrary = async (cardUri?: string): Promise<boolean> => {
    const granted = await requestLibraryPermission();
    if (!granted) return false;
    const uri = cardUri ?? (await captureCard());
    await MediaLibrary.createAssetAsync(uri);
    return true;
  };

  // OS 공유 시트: 항상 카드 스냅샷 이미지로 공유
  const shareMedia = async (): Promise<boolean> => {
    const uri = await captureCard();
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      const saved = await saveToLibrary(uri);
      if (saved) Alert.alert('저장 완료', '공유 이미지를 갤러리에 저장했어요.');
      return saved;
    }
    await Sharing.shareAsync(uri, {
      mimeType: 'image/jpeg',
      dialogTitle: '랜데루 공유하기',
      UTI: 'public.jpeg',
    });
    return true;
  };

  const finalizeShare = async (channel: string) => {
    try {
      await markAsShared(record.record_id, channel);
      if (todayRecord?.record_id === record.record_id) setActionShared();
      logActionShared(record.action_id, channel);
      trackActionActivity(record.user_id, action, 'shared', {
        record_id: record.record_id,
        share_channel: channel,
      });
    } catch (e) {
      console.error('finalizeShare error:', e);
    }
  };

  // ── 인스타그램 (항상 카드 스냅샷 이미지로 공유) ─────────────────────────
  const handleInstagram = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await showRewardedAd();
      const uri = await captureCard();
      const saved = await saveToLibrary(uri);
      if (!saved) return;

      const canOpenStories = await Linking.canOpenURL(INSTAGRAM_STORIES_URL);
      const canOpenInstagram = await Linking.canOpenURL(INSTAGRAM_URL);
      const instagramUrl = canOpenStories ? INSTAGRAM_STORIES_URL : INSTAGRAM_URL;

      if (canOpenStories || canOpenInstagram) {
        Alert.alert(
          '이미지가 저장됐어요',
          '인스타그램에서 방금 저장된 카드 이미지를 선택해 공유해주세요.',
          [
            { text: '인스타그램 열기', onPress: () => Linking.openURL(instagramUrl) },
            { text: '닫기', style: 'cancel' },
          ],
        );
      } else {
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/jpeg',
            dialogTitle: '랜데루 공유하기',
            UTI: 'public.jpeg',
          });
        } else {
          Alert.alert('저장 완료', '카드 이미지가 갤러리에 저장됐어요.');
        }
      }
      await finalizeShare('instagram');
    } catch (e) {
      console.error('handleInstagram error:', e);
      Alert.alert('오류', '공유 중 문제가 발생했어요. 다시 시도해주세요.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── OS 공유 시트 ──────────────────────────────────────────────────────────
  const handleShareSheet = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await showRewardedAd();
      const shared = await shareMedia();
      if (!shared) return;
      await finalizeShare('share_sheet');
    } catch (e) {
      console.error('handleShareSheet error:', e);
      Alert.alert('오류', '공유 중 문제가 발생했어요. 다시 시도해주세요.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── 미디어 저장 ───────────────────────────────────────────────────────────
  const handleSaveImage = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await showRewardedAd();
      const saved = await saveToLibrary();
      if (!saved) return;
      Alert.alert('저장 완료', '카드 이미지가 갤러리에 저장됐어요.');
      await finalizeShare('save_image');
    } catch (e) {
      console.error('handleSaveImage error:', e);
      Alert.alert('오류', '저장 중 문제가 발생했어요.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="오늘을 공유해요" showBack />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 공유 카드 미리보기 */}
        <View style={styles.cardWrapper}>
          <ShareCard
            ref={cardRef}
            title={action.title}
            copyTemplate={action.share_copy_template}
            memo={record.memo}
            mediaUrl={cardPreviewUrl}
            mediaType={record.media_type}
            completedAt={record.completed_at}
            onImageLoaded={handleImageLoaded}
          />
        </View>

        {/* 로딩 */}
        {isProcessing && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>잠시만 기다려주세요...</Text>
          </View>
        )}

        {/* 공유 옵션 */}
        <View style={styles.optionGrid}>
          <ShareOptionCard
            label="인스타그램에 공유"
            onPress={handleInstagram}
            disabled={isProcessing}
          />
          <ShareOptionCard
            label="다른 앱으로 공유"
            onPress={handleShareSheet}
            disabled={isProcessing}
          />
          <ShareOptionCard
            label="카드 이미지 저장하기"
            onPress={handleSaveImage}
            disabled={isProcessing}
          />
        </View>

        {/* 기록만 남기기 */}
        <Button
          label="기록만 남기기"
          onPress={() => navigation.popToTop()}
          variant="text"
          style={{ marginTop: Spacing.xl }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl, alignItems: 'center' },
  cardWrapper: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
    marginBottom: Spacing.xl,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  loadingText: { fontSize: 13, color: Colors.textSecondary },
  optionGrid: { width: '100%', gap: Spacing.sm },
});
