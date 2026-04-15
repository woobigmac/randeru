import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { useActionStore } from '../../store/useActionStore';
import { markAsShared } from '../../services/recordService';
import { showRewardedAd } from '../../services/adService';
import { DailyRecord, Action } from '../../types';

// HomeStack / RecordsStack 어디서든 재사용 가능하도록 제네릭 타입 사용
type ShareRouteParams = { record: DailyRecord; action: Action };
type Props = {
  navigation: StackNavigationProp<Record<string, ShareRouteParams | undefined>, string>;
  route: RouteProp<{ Share: ShareRouteParams }, 'Share'>;
};

const SHARE_HASHTAGS = '#랜데루 #오늘의인간다움 #하루한번작은행동';

// ─── 공유 카드 컴포넌트 ────────────────────────────────────────────────────────
type ShareCardProps = {
  title: string;
  copyTemplate: string;
  photoUrl?: string;
};

const ShareCard = React.forwardRef<ViewShot, ShareCardProps>(
  ({ title, copyTemplate, photoUrl }, ref) => (
    <ViewShot ref={ref} options={{ format: 'jpg', quality: 0.95 }}>
      <View
        style={{
          width: 320,
          backgroundColor: '#fff',
          borderRadius: 16,
          overflow: 'hidden',
          padding: 24,
        }}
      >
        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            style={{ width: '100%', height: 200, borderRadius: 8, marginBottom: 16 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: '100%',
              height: 120,
              borderRadius: 8,
              backgroundColor: '#f0f0f0',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 14, color: '#aaa' }}>사진 없음</Text>
          </View>
        )}

        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>{title}</Text>
        <Text style={{ fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 12 }}>
          {copyTemplate}
        </Text>
        <Text style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>
          {SHARE_HASHTAGS}
        </Text>

        <Text style={{ fontSize: 11, color: '#bbb', textAlign: 'right' }}>랜데루</Text>
      </View>
    </ViewShot>
  ),
);

// ─── 메인 ShareScreen ──────────────────────────────────────────────────────────
export default function ShareScreen({ navigation, route }: Props) {
  const { record, action } = route.params;
  const { todayRecord, setActionShared } = useActionStore();
  const cardRef = useRef<ViewShot>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  /** 카드 이미지를 캡처해서 URI 반환 */
  const captureCard = async (): Promise<string> => {
    const uri = await captureRef(cardRef, { format: 'jpg', quality: 0.95 });
    return uri;
  };

  /** 공유 완료 후 공통 처리 */
  const finalizeShare = async (channel: string) => {
    try {
      await markAsShared(record.record_id, channel);
      // 오늘의 액션과 동일한 record일 때만 actionStore 상태 갱신
      if (todayRecord?.record_id === record.record_id) {
        setActionShared();
      }
    } catch (e) {
      console.error('finalizeShare error:', e);
    }
  };

  /** SNS 공유 공통 플로우: 광고 → 캡처 → 공유 → 기록 */
  const handleSnsShare = async (channel: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      // ① 광고 시청 (실패해도 공유 계속 진행)
      await showRewardedAd();

      // ② 카드 캡처
      const uri = await captureCard();

      // ③ 시스템 공유 시트 호출
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/jpeg' });
      } else {
        Alert.alert('공유 불가', '이 기기에서는 공유 기능을 사용할 수 없어요.');
        return;
      }

      // ④ 공유 완료 처리
      await finalizeShare(channel);
    } catch (e) {
      console.error('handleSnsShare error:', e);
      Alert.alert('오류', '공유 중 문제가 발생했어요. 다시 시도해주세요.');
    } finally {
      setIsProcessing(false);
    }
  };

  /** 링크 복사: 광고 없이 바로 복사 */
  const handleCopyLink = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const text = `${action.title}\n${action.share_copy_template}\n${SHARE_HASHTAGS}`;
      await Clipboard.setStringAsync(text);
      Alert.alert('복사 완료', '클립보드에 복사됐어요!');
      await finalizeShare('link');
    } catch (e) {
      console.error('handleCopyLink error:', e);
      Alert.alert('오류', '복사 중 문제가 발생했어요.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 24, paddingBottom: 48, alignItems: 'center' }}
    >
      {/* 뒤로가기 */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ alignSelf: 'flex-start', marginBottom: 24, marginTop: 16 }}
      >
        <Text style={{ fontSize: 14, color: '#888' }}>← 뒤로</Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 24 }}>
        오늘을 공유해보세요
      </Text>

      {/* 공유 카드 미리보기 */}
      <ShareCard
        ref={cardRef}
        title={action.title}
        copyTemplate={action.share_copy_template}
        photoUrl={record.photo_url}
      />

      {/* 로딩 인디케이터 */}
      {isProcessing && (
        <View style={{ marginVertical: 16 }}>
          <ActivityIndicator size="small" />
          <Text style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
            광고 로드 중... 잠시만 기다려주세요
          </Text>
        </View>
      )}

      {/* 공유 버튼 영역 */}
      <View style={{ width: '100%', marginTop: 32, gap: 12 }}>
        <TouchableOpacity
          onPress={() => handleSnsShare('instagram')}
          disabled={isProcessing}
          style={{
            paddingVertical: 14,
            alignItems: 'center',
            backgroundColor: isProcessing ? '#ccc' : '#000',
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>
            인스타그램에 공유
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleSnsShare('threads')}
          disabled={isProcessing}
          style={{
            paddingVertical: 14,
            alignItems: 'center',
            backgroundColor: isProcessing ? '#ccc' : '#000',
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>
            스레드에 공유
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleSnsShare('kakaotalk')}
          disabled={isProcessing}
          style={{
            paddingVertical: 14,
            alignItems: 'center',
            backgroundColor: isProcessing ? '#ccc' : '#FEE500',
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#000', fontSize: 15, fontWeight: 'bold' }}>
            카카오톡에 공유
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleCopyLink}
          disabled={isProcessing}
          style={{
            paddingVertical: 14,
            alignItems: 'center',
            borderWidth: 1.5,
            borderColor: isProcessing ? '#ccc' : '#000',
            borderRadius: 8,
          }}
        >
          <Text style={{ color: isProcessing ? '#ccc' : '#000', fontSize: 15, fontWeight: 'bold' }}>
            링크 복사
          </Text>
        </TouchableOpacity>
      </View>

      {/* 기록만 남기기 */}
      <TouchableOpacity
        onPress={() => navigation.popToTop()}
        style={{ marginTop: 32 }}
      >
        <Text style={{ fontSize: 14, color: '#aaa', textDecorationLine: 'underline' }}>
          기록만 남기기
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
