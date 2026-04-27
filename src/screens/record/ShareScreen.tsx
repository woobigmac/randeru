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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { shareCustomTemplate } from '@react-native-kakao/share';
import { useActionStore } from '../../store/useActionStore';
import { markAsShared } from '../../services/recordService';
import { showRewardedAd } from '../../services/adService';
import { logActionShared } from '../../services/analyticsService';
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

// ─── 공유 카드 ──────────────────────────────────────────────────────────────
type ShareCardProps = {
  title: string;
  copyTemplate: string;
  memo?: string;
  mediaUrl?: string;
  mediaType?: 'photo' | 'video';
  onImageLoaded?: () => void;
};

const ShareCard = React.forwardRef<ViewShot, ShareCardProps>(
  ({ title, copyTemplate, memo, mediaUrl, mediaType, onImageLoaded }, ref) => {
    const [imageError, setImageError] = useState(false);
    const showImage = !!mediaUrl && !imageError;

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

          {/* 5. 워터마크 (우하단) */}
          <View style={cardStyles.watermarkRow}>
            <Image source={APP_ICON} style={cardStyles.watermarkIcon} />
            <Text style={cardStyles.watermarkText}>랜데루</Text>
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
  watermarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
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

  const mediaUrl = record.media_url ?? record.photo_url;

  /** 이미지 로드 완료 혹은 이미지 없음 시 호출 */
  const handleImageLoaded = () => setImageReady(true);

  /** 이미지가 준비될 때까지 대기 후 캡처 */
  const captureCard = (): Promise<string> =>
    new Promise((resolve, reject) => {
      const tryCapture = async () => {
        try {
          const uri = await captureRef(cardRef as React.RefObject<React.Component>, {
            format: 'jpg',
            quality: 0.95,
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
          waited += 100;
          if (imageReady || !mediaUrl || waited >= 3000) {
            clearInterval(interval);
            tryCapture();
          }
        }, 100);
      }
    });

  const finalizeShare = async (channel: string) => {
    try {
      await markAsShared(record.record_id, channel);
      if (todayRecord?.record_id === record.record_id) setActionShared();
      logActionShared(record.action_id, channel);
    } catch (e) {
      console.error('finalizeShare error:', e);
    }
  };

  // ── 인스타그램 ────────────────────────────────────────────────────────────
  const handleInstagram = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await showRewardedAd();
      const uri = await captureCard();

      const igUrl = 'instagram-stories://share';
      const canOpen = await Linking.canOpenURL(igUrl);
      if (!canOpen) {
        Alert.alert('인스타그램 앱을 설치해주세요');
        return;
      }

      // base64로 인코딩 후 URL Scheme 호출
      const base64 = await readAsStringAsync(uri, {
        encoding: EncodingType.Base64,
      });
      await Linking.openURL(
        `instagram-stories://share?backgroundImage=${encodeURIComponent(`data:image/jpeg;base64,${base64}`)}`,
      );
      await finalizeShare('instagram');
    } catch (e) {
      console.error('handleInstagram error:', e);
      Alert.alert('오류', '공유 중 문제가 발생했어요. 다시 시도해주세요.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── 카카오톡 ──────────────────────────────────────────────────────────────
  const handleKakao = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await showRewardedAd();
      const uri = await captureCard();

      const kakaoUrl = 'kakaolink://';
      const canOpen = await Linking.canOpenURL(kakaoUrl);
      if (!canOpen) {
        Alert.alert('카카오톡 앱을 설치해주세요');
        return;
      }

      // templateId는 카카오 개발자 콘솔에서 발급받은 커스텀 템플릿 ID로 교체 필요
      await shareCustomTemplate({
        templateId: 0,
        templateArgs: {
          title: action.title,
          description: action.share_copy_template,
          imageUri: uri,
        },
      });
      await finalizeShare('kakaotalk');
    } catch (e: any) {
      // 템플릿 ID 미설정 등 개발 단계 오류는 무시
      if (String(e?.message).includes('templateId')) {
        Alert.alert('안내', '카카오 공유 템플릿을 설정해주세요 (카카오 개발자 콘솔).');
      } else {
        console.error('handleKakao error:', e);
        Alert.alert('오류', '카카오 공유 중 문제가 발생했어요.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // ── 스레드 ────────────────────────────────────────────────────────────────
  const handleThreads = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await showRewardedAd();
      const uri = await captureCard();

      // 갤러리에 저장
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '이미지를 저장하려면 갤러리 접근 권한이 필요해요.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);

      const threadsUrl = 'threads://';
      const canOpen = await Linking.canOpenURL(threadsUrl);
      if (canOpen) {
        Alert.alert('이미지가 저장됐어요. 스레드 앱에서 업로드해주세요', '', [
          { text: '스레드 열기', onPress: () => Linking.openURL(threadsUrl) },
          { text: '닫기', style: 'cancel' },
        ]);
      } else {
        Alert.alert('스레드 앱 없음', '앱 스토어로 이동할까요?', [
          {
            text: '앱스토어 이동',
            onPress: () =>
              Linking.openURL('https://apps.apple.com/app/threads/id6446901002'),
          },
          { text: '취소', style: 'cancel' },
        ]);
        return;
      }
      await finalizeShare('threads');
    } catch (e) {
      console.error('handleThreads error:', e);
      Alert.alert('오류', '공유 중 문제가 발생했어요. 다시 시도해주세요.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── 이미지 저장 ───────────────────────────────────────────────────────────
  const handleSaveImage = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await showRewardedAd();
      const uri = await captureCard();

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '이미지를 저장하려면 갤러리 접근 권한이 필요해요.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('저장 완료', '이미지가 갤러리에 저장됐어요');
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
            mediaUrl={mediaUrl}
            mediaType={record.media_type}
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
            label="카카오톡에 공유"
            onPress={handleKakao}
            disabled={isProcessing}
          />
          <ShareOptionCard
            label="스레드에 공유"
            onPress={handleThreads}
            disabled={isProcessing}
          />
          <ShareOptionCard
            label="이미지 저장하기"
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
