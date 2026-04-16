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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { useActionStore } from '../../store/useActionStore';
import { markAsShared } from '../../services/recordService';
import { showRewardedAd } from '../../services/adService';
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

// ─── 공유 카드 ──────────────────────────────────────────────────────────────
type ShareCardProps = {
  title: string;
  copyTemplate: string;
  mediaUrl?: string;
  mediaType?: 'photo' | 'video';
};

const ShareCard = React.forwardRef<ViewShot, ShareCardProps>(
  ({ title, copyTemplate, mediaUrl, mediaType }, ref) => (
    <ViewShot ref={ref} options={{ format: 'jpg', quality: 0.95 }}>
      <View style={cardStyles.card}>
        {mediaUrl ? (
          <View style={{ position: 'relative' }}>
            <Image source={{ uri: mediaUrl }} style={cardStyles.photo} resizeMode="cover" />
            {mediaType === 'video' && (
              <View style={cardStyles.videoBadge}>
                <Text style={cardStyles.videoBadgeText}>영상</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={cardStyles.photoPlaceholder}>
            <Text style={{ fontSize: 13, color: Colors.textTertiary }}>미디어 없음</Text>
          </View>
        )}
        <Text style={cardStyles.title}>{title}</Text>
        <Text style={cardStyles.copy}>{copyTemplate}</Text>
        <Text style={cardStyles.hashtag}>{SHARE_HASHTAGS}</Text>
        <Text style={cardStyles.watermark}>랜데루</Text>
      </View>
    </ViewShot>
  ),
);

const cardStyles = StyleSheet.create({
  card: {
    width: 320,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    padding: Spacing.lg,
  },
  photo: { width: '100%', height: 200, borderRadius: Radius.md, marginBottom: Spacing.md },
  photoPlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  videoBadge: {
    position: 'absolute',
    bottom: Spacing.sm + Spacing.md,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: Radius.sm,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  videoBadgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
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
  watermark: {
    fontFamily: Fonts.handwriting,
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: 'right',
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

  const captureCard = async (): Promise<string> =>
    captureRef(cardRef, { format: 'jpg', quality: 0.95 });

  const finalizeShare = async (channel: string) => {
    try {
      await markAsShared(record.record_id, channel);
      if (todayRecord?.record_id === record.record_id) setActionShared();
    } catch (e) {
      console.error('finalizeShare error:', e);
    }
  };

  const handleSnsShare = async (channel: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await showRewardedAd();
      const uri = await captureCard();
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/jpeg' });
      } else {
        Alert.alert('공유 불가', '이 기기에서는 공유 기능을 사용할 수 없어요.');
        return;
      }
      await finalizeShare(channel);
    } catch (e) {
      console.error('handleSnsShare error:', e);
      Alert.alert('오류', '공유 중 문제가 발생했어요. 다시 시도해주세요.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyLink = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const text = `${action.title}\n${action.share_copy_template}\n${SHARE_HASHTAGS}`;
      await Clipboard.setStringAsync(text);
      Alert.alert('복사 완료', '클립보드에 복사됐어요!');
      await finalizeShare('link');
    } catch (e) {
      Alert.alert('오류', '복사 중 문제가 발생했어요.');
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
            mediaUrl={record.thumbnail_url ?? record.media_url ?? record.photo_url}
            mediaType={record.media_type}
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
          <ShareOptionCard label="인스타그램" onPress={() => handleSnsShare('instagram')} disabled={isProcessing} />
          <ShareOptionCard label="스레드" onPress={() => handleSnsShare('threads')} disabled={isProcessing} />
          <ShareOptionCard label="카카오톡" onPress={() => handleSnsShare('kakaotalk')} disabled={isProcessing} />
          <ShareOptionCard label="링크 복사" onPress={handleCopyLink} disabled={isProcessing} />
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
