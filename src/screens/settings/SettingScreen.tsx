import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  Modal,
  StyleSheet,
  SafeAreaView as RNSafeAreaView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useUserStore } from '../../store/useUserStore';
import { MyPageStackParamList } from '../../navigation/MyPageStackNavigator';
import { APP_VERSION } from '../../constants';
import { Colors, Fonts, Radius, Spacing } from '../../constants/theme';

type Props = {
  navigation: StackNavigationProp<MyPageStackParamList, 'Setting'>;
};

type PolicyModal = null | 'terms' | 'privacy';

const NICKNAME_REGEX = /^[가-힣a-zA-Z0-9]{2,10}$/;

const TERMS_TEXT = `제1조 (목적)
본 약관은 랜데루(이하 "서비스")가 제공하는 모바일 애플리케이션 서비스 이용에 관한 조건 및 절차를 규정함을 목적으로 합니다.

제2조 (서비스 이용)
- 만 10세 이상 누구나 이용 가능합니다
- 서비스 내 콘텐츠는 개인적, 비상업적 용도로만 사용 가능합니다
- 타인에게 불쾌감을 주거나 법령에 위반되는 방식으로 서비스를 이용할 수 없습니다

제3조 (광고)
- 서비스는 광고를 포함하며, 광고 수익은 서비스 운영에 사용됩니다
- 리워드 광고는 특정 기능 사용 시 자발적으로 시청할 수 있습니다

제4조 (면책조항)
- 서비스는 콘텐츠의 정확성, 완전성을 보증하지 않습니다
- 서비스 이용 중 발생한 손해에 대해 서비스는 책임을 지지 않습니다

제5조 (약관 변경)
서비스는 필요 시 약관을 변경할 수 있으며, 변경 시 앱 내 공지합니다.`;

const PRIVACY_TEXT = `1. 수집하는 개인정보
- 닉네임, 나이 (서비스 제공 목적)
- 카카오 로그인 시: 카카오 계정 ID, 프로필 정보
- 서비스 이용 기록, 액션 수행 기록

2. 개인정보 이용 목적
- 서비스 제공 및 개선
- 랜덤 액션 제공
- 푸시 알림 발송

3. 개인정보 보관 기간
- 회원 탈퇴 시 즉시 삭제
- 관계 법령에 따라 보존이 필요한 경우 해당 기간 보관

4. 개인정보 제3자 제공
- 원칙적으로 제3자에게 제공하지 않습니다
- Google AdMob 광고 서비스 운영을 위한 최소한의 정보 제공

5. 문의
개인정보 관련 문의는 앱 내 문의하기를 통해 접수해주세요.`;

export default function SettingScreen({ navigation }: Props) {
  const user = useUserStore((s) => s.user);
  const setNickname = useUserStore((s) => s.setNickname);
  const logout = useUserStore((s) => s.logout);
  const deleteAccount = useUserStore((s) => s.deleteAccount);
  const [policyModal, setPolicyModal] = useState<PolicyModal>(null);

  const handleEditNickname = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        '닉네임 수정',
        '2~10자, 한글/영문/숫자만 사용 가능해요',
        async (text) => {
          if (!text) return;
          const trimmed = text.trim();
          if (!NICKNAME_REGEX.test(trimmed)) {
            Alert.alert('유효하지 않은 닉네임', '2~10자, 특수문자는 사용할 수 없어요.');
            return;
          }
          await setNickname(trimmed);
          Alert.alert('완료', '닉네임이 변경됐어요!');
        },
        'plain-text',
        user?.nickname ?? '',
      );
    } else {
      Alert.alert('닉네임 수정', 'iOS 기기에서만 지원됩니다.');
    }
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          try { await logout(); } catch (e) { console.warn('logout error:', e); }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert('탈퇴하기', '정말 탈퇴하시겠어요?\n모든 기록이 삭제됩니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '탈퇴',
        style: 'destructive',
        onPress: async () => {
          try {
            if (user?.loginType === 'kakao' && user?.user_id) {
              await deleteDoc(doc(db, 'users', user.user_id));
            }
          } catch (e) {
            console.warn('deleteDoc error:', e);
          } finally {
            await deleteAccount();
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.menuSection}>
          <SettingItem label="닉네임 수정" onPress={handleEditNickname} />
          <SettingItem label="이용약관" onPress={() => setPolicyModal('terms')} />
          <SettingItem label="개인정보처리방침" onPress={() => setPolicyModal('privacy')} />
          <SettingItem label={`앱 버전 ${APP_VERSION}`} isStatic />
          <SettingItem label="로그아웃" onPress={handleLogout} isDanger />
          <SettingItem label="탈퇴하기" onPress={handleDeleteAccount} isDanger isLast />
        </View>
      </ScrollView>

      <PolicyModalView
        visible={policyModal !== null}
        title={policyModal === 'terms' ? '이용약관' : '개인정보처리방침'}
        content={policyModal === 'terms' ? TERMS_TEXT : PRIVACY_TEXT}
        onClose={() => setPolicyModal(null)}
      />
    </SafeAreaView>
  );
}

function PolicyModalView({
  visible,
  title,
  content,
  onClose,
}: {
  visible: boolean;
  title: string;
  content: string;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <RNSafeAreaView style={modalStyles.container}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={modalStyles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={modalStyles.body} showsVerticalScrollIndicator={false}>
          <Text style={modalStyles.content}>{content}</Text>
        </ScrollView>
      </RNSafeAreaView>
    </Modal>
  );
}

type SettingItemProps = {
  label: string;
  onPress?: () => void;
  isStatic?: boolean;
  isDanger?: boolean;
  isLast?: boolean;
};

function SettingItem({ label, onPress, isStatic = false, isDanger = false, isLast = false }: SettingItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isStatic}
      activeOpacity={0.7}
      style={[styles.item, isLast && styles.itemLast]}
    >
      <Text style={[styles.label, isDanger && styles.labelDanger, isStatic && styles.labelStatic]}>
        {label}
      </Text>
      {!isStatic && <Text style={styles.arrow}>›</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingTop: Spacing.md, paddingBottom: Spacing.xxl },
  menuSection: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  item: {
    paddingVertical: 16,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemLast: { borderBottomWidth: 0 },
  label: { fontSize: 15, color: Colors.text },
  labelDanger: { color: Colors.error },
  labelStatic: { color: Colors.textSecondary },
  arrow: { fontSize: 18, color: Colors.textTertiary },
});

const modalStyles = StyleSheet.create({
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
  title: {
    fontFamily: Fonts.handwriting,
    fontSize: 18,
    color: Colors.text,
  },
  closeBtn: { padding: Spacing.xs },
  closeText: { fontSize: 18, color: Colors.textSecondary },
  body: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  content: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
});
