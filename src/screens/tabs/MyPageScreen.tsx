import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  StyleSheet,
  Linking,
  SafeAreaView as RNSafeAreaView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useUserStore } from '../../store/useUserStore';
import { useRecordStore } from '../../store/useRecordStore';
import { MyPageStackParamList } from '../../navigation/MyPageStackNavigator';
import { TONES, APP_VERSION } from '../../constants';
import { Colors, Fonts, Radius, Spacing } from '../../constants/theme';

type Props = {
  navigation: StackNavigationProp<MyPageStackParamList, 'MyPageMain'>;
};

type PolicyModal = null | 'terms' | 'privacy';

// ─── 이용약관 텍스트 ──────────────────────────────────────────────────────────
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

// ─── 개인정보처리방침 텍스트 ─────────────────────────────────────────────────
const PRIVACY_TEXT = `1. 수집하는 개인정보
- 닉네임, 나이, 관심 톤 (서비스 제공 목적)
- 카카오 로그인 시: 카카오 계정 ID, 프로필 정보
- 서비스 이용 기록, 액션 수행 기록

2. 개인정보 이용 목적
- 서비스 제공 및 개선
- 맞춤형 콘텐츠 추천
- 푸시 알림 발송

3. 개인정보 보관 기간
- 회원 탈퇴 시 즉시 삭제
- 관계 법령에 따라 보존이 필요한 경우 해당 기간 보관

4. 개인정보 제3자 제공
- 원칙적으로 제3자에게 제공하지 않습니다
- Google AdMob 광고 서비스 운영을 위한 최소한의 정보 제공

5. 문의
개인정보 관련 문의는 앱 내 문의하기를 통해 접수해주세요.`;

function formatJoinedDate(createdAt: any): string {
  if (!createdAt) return '';
  try {
    const d = typeof createdAt?.toDate === 'function' ? createdAt.toDate() : new Date(createdAt);
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function MyPageScreen({ navigation }: Props) {
  const user = useUserStore((s) => s.user);
  const logout = useUserStore((s) => s.logout);
  const deleteAccount = useUserStore((s) => s.deleteAccount);
  const { stats, loadRecords } = useRecordStore();
  const [policyModal, setPolicyModal] = useState<PolicyModal>(null);

  useEffect(() => {
    if (user?.user_id) loadRecords(user.user_id);
  }, [user?.user_id]);

  const toneLabels = (user?.selected_tones ?? []).map(
    (id) => TONES.find((t) => t.id === id)?.label ?? id,
  );

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠어요?', [
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

  const joinedDate = formatJoinedDate(user?.created_at);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* 프로필 카드 */}
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <Text style={styles.nickname}>{user?.nickname ?? ''}</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('ProfileEdit')}
              style={styles.editBtn}
            >
              <Text style={styles.editBtnText}>내 정보 수정</Text>
            </TouchableOpacity>
          </View>
          {!!joinedDate && (
            <Text style={styles.joinedDate}>{joinedDate} 가입</Text>
          )}
          <View style={styles.pillRow}>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{stats.totalCount}</Text>
              <Text style={styles.statLabel}>누적 액션</Text>
            </View>
            <View style={styles.pillDivider} />
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{stats.streakDays}일</Text>
              <Text style={styles.statLabel}>연속 수행</Text>
            </View>
          </View>
        </View>

        {/* 관심 톤 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>관심 톤</Text>
          {toneLabels.length > 0 ? (
            <View style={styles.toneRow}>
              {toneLabels.map((label) => (
                <View key={label} style={styles.tonePill}>
                  <Text style={styles.tonePillText}>{label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View>
              <Text style={styles.emptyToneText}>관심 톤을 아직 정하지 않았어요</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('ToneSelect')}
                style={styles.toneButton}
              >
                <Text style={styles.toneButtonText}>관심 톤 정하러 가기</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 메뉴 */}
        <View style={styles.menuSection}>
          <MenuItem icon="🔔" label="알림 설정" onPress={() => navigation.navigate('NotificationSetting')} />
          <MenuItem icon="📄" label="이용약관" onPress={() => setPolicyModal('terms')} />
          <MenuItem icon="🔐" label="개인정보처리방침" onPress={() => setPolicyModal('privacy')} />
          <MenuItem icon="💌" label="문의하기" onPress={() => Linking.openURL('mailto:support@randeru.app')} />
          <MenuItem icon="ℹ️" label={`앱 버전 ${APP_VERSION}`} isStatic />
          <MenuItem icon="🚪" label="로그아웃" onPress={handleLogout} isDanger />
          <MenuItem icon="✕" label="탈퇴하기" onPress={handleDeleteAccount} isDanger isLast />
        </View>
      </ScrollView>

      {/* 약관/개인정보 Modal */}
      <PolicyModalView
        visible={policyModal !== null}
        title={policyModal === 'terms' ? '이용약관' : '개인정보처리방침'}
        content={policyModal === 'terms' ? TERMS_TEXT : PRIVACY_TEXT}
        onClose={() => setPolicyModal(null)}
      />
    </SafeAreaView>
  );
}

// ─── PolicyModal ─────────────────────────────────────────────────────────────
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

// ─── MenuItem ────────────────────────────────────────────────────────────────
type MenuItemProps = {
  icon: string;
  label: string;
  onPress?: () => void;
  isStatic?: boolean;
  isDanger?: boolean;
  isLast?: boolean;
};

function MenuItem({ icon, label, onPress, isStatic = false, isDanger = false, isLast = false }: MenuItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isStatic}
      activeOpacity={0.7}
      style={[styles.menuItem, isLast && styles.menuItemLast]}
    >
      <View style={styles.menuLeft}>
        <Text style={styles.menuIcon}>{icon}</Text>
        <Text style={[styles.menuLabel, isDanger && styles.menuDanger, isStatic && styles.menuStatic]}>
          {label}
        </Text>
      </View>
      {!isStatic && <Text style={styles.menuArrow}>›</Text>}
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: Spacing.xxl },

  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    margin: Spacing.lg,
    padding: Spacing.lg,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  editBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  editBtnText: { fontSize: 12, color: Colors.primary, fontWeight: '500' },
  nickname: {
    fontFamily: Fonts.handwriting,
    fontSize: 22,
    color: Colors.text,
  },
  joinedDate: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: Spacing.md,
  },
  pillRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm },
  statPill: { alignItems: 'center', flex: 1 },
  statValue: {
    fontFamily: Fonts.handwriting,
    fontSize: 20,
    color: Colors.primary,
    marginBottom: 2,
  },
  statLabel: { fontSize: 11, color: Colors.textSecondary },
  pillDivider: { width: 1, height: 32, backgroundColor: Colors.border },

  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  toneRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tonePill: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  tonePillText: { fontSize: 13, color: Colors.primaryDark, fontWeight: '500' },
  emptyToneText: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.sm },
  toneButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.full,
  },
  toneButtonText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  menuSection: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  menuIcon: { fontSize: 16, width: 24, textAlign: 'center' },
  menuLabel: { fontSize: 15, color: Colors.text },
  menuDanger: { color: Colors.error },
  menuStatic: { color: Colors.textSecondary },
  menuArrow: { fontSize: 18, color: Colors.textTertiary },
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
  closeBtn: {
    padding: Spacing.xs,
  },
  closeText: { fontSize: 18, color: Colors.textSecondary },
  body: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  content: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
});
