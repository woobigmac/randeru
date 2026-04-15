import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useUserStore } from '../../store/useUserStore';
import { MyPageStackParamList } from '../../navigation/MyPageStackNavigator';
import { APP_VERSION } from '../../constants';

type Props = {
  navigation: StackNavigationProp<MyPageStackParamList, 'Setting'>;
};

const NICKNAME_REGEX = /^[가-힣a-zA-Z0-9]{2,10}$/;

export default function SettingScreen({ navigation }: Props) {
  const user = useUserStore((s) => s.user);
  const setNickname = useUserStore((s) => s.setNickname);
  const clearUser = useUserStore((s) => s.clearUser);

  // ─── 닉네임 수정 ──────────────────────────────────────────────────────────
  const handleEditNickname = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        '닉네임 수정',
        '새 닉네임을 입력하세요 (2~10자, 특수문자 불가)',
        async (text) => {
          if (!text) return;
          const trimmed = text.trim();
          if (!NICKNAME_REGEX.test(trimmed)) {
            Alert.alert('유효하지 않은 닉네임', '2~10자, 한글/영문/숫자만 사용할 수 있어요.');
            return;
          }
          await setNickname(trimmed);
          Alert.alert('완료', '닉네임이 변경됐어요!');
        },
        'plain-text',
        user?.nickname ?? '',
      );
    } else {
      // Android: Alert.prompt 미지원 — 별도 입력 UI 필요 (추후 개선)
      Alert.alert('닉네임 수정', 'iOS 기기에서만 지원됩니다.');
    }
  };

  // ─── 탈퇴 ─────────────────────────────────────────────────────────────────
  const handleDeleteAccount = () => {
    Alert.alert(
      '탈퇴하기',
      '정말 탈퇴하시겠어요?\n모든 기록이 삭제됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: async () => {
            try {
              if (user?.user_id) {
                await deleteDoc(doc(db, 'users', user.user_id));
              }
            } catch (e) {
              console.warn('deleteDoc error:', e);
            } finally {
              await clearUser();
              // clearUser가 isOnboardingComplete를 false로 설정 →
              // RootNavigator가 자동으로 OnboardingNavigator로 전환
            }
          },
        },
      ],
    );
  };

  const handleNotImplemented = () => Alert.alert('준비 중', '준비 중입니다.');

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }}>
      <SettingItem label="닉네임 수정" onPress={handleEditNickname} />
      <SettingItem
        label="알림 설정"
        onPress={() => navigation.navigate('NotificationSetting')}
      />
      <SettingItem label="이용약관" onPress={handleNotImplemented} />
      <SettingItem label="개인정보처리방침" onPress={handleNotImplemented} />
      <SettingItem label={`앱 버전 ${APP_VERSION}`} isStatic />
      <SettingItem label="탈퇴하기" onPress={handleDeleteAccount} isDanger />
    </ScrollView>
  );
}

type SettingItemProps = {
  label: string;
  onPress?: () => void;
  isStatic?: boolean;
  isDanger?: boolean;
};

function SettingItem({ label, onPress, isStatic = false, isDanger = false }: SettingItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isStatic}
      style={{
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 15, color: isDanger ? '#e53e3e' : '#111' }}>{label}</Text>
      {!isStatic && <Text style={{ fontSize: 14, color: '#ccc' }}>›</Text>}
    </TouchableOpacity>
  );
}
