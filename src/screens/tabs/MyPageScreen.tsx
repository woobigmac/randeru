import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { useUserStore } from '../../store/useUserStore';
import { useRecordStore } from '../../store/useRecordStore';
import { MyPageStackParamList } from '../../navigation/MyPageStackNavigator';
import { TONES, APP_VERSION } from '../../constants';
import { Colors, Fonts, Radius, Spacing } from '../../constants/theme';

type Props = {
  navigation: StackNavigationProp<MyPageStackParamList, 'MyPageMain'>;
};

export default function MyPageScreen({ navigation }: Props) {
  const user = useUserStore((s) => s.user);
  const clearUser = useUserStore((s) => s.clearUser);
  const { stats, loadRecords } = useRecordStore();

  useEffect(() => {
    if (user?.user_id) loadRecords(user.user_id);
  }, [user?.user_id]);

  const toneLabels = (user?.selected_tones ?? []).map(
    (id) => TONES.find((t) => t.id === id)?.label ?? id,
  );

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => clearUser() },
    ]);
  };

  const handleNotImplemented = () => Alert.alert('준비 중', '준비 중입니다.');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 프로필 카드 */}
        <View style={styles.profileCard}>
          <Text style={styles.nickname}>{user?.nickname ?? ''}</Text>
          <View style={styles.pillRow}>
            <View style={styles.pill}>
              <Text style={styles.pillValue}>{stats.totalCount}</Text>
              <Text style={styles.pillLabel}>누적</Text>
            </View>
            <View style={styles.pillDivider} />
            <View style={styles.pill}>
              <Text style={styles.pillValue}>{stats.streakDays}일</Text>
              <Text style={styles.pillLabel}>연속</Text>
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
          <MenuItem label="설정" onPress={() => navigation.navigate('Setting')} />
          <MenuItem label="알림 설정" onPress={() => navigation.navigate('NotificationSetting')} />
          <MenuItem label="이용약관" onPress={handleNotImplemented} />
          <MenuItem label="개인정보처리방침" onPress={handleNotImplemented} />
          <MenuItem label="문의하기" onPress={handleNotImplemented} />
          <MenuItem label={`앱 버전 ${APP_VERSION}`} isStatic />
          <MenuItem label="로그아웃" onPress={handleLogout} isDanger />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type MenuItemProps = {
  label: string;
  onPress?: () => void;
  isStatic?: boolean;
  isDanger?: boolean;
};

function MenuItem({ label, onPress, isStatic = false, isDanger = false }: MenuItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isStatic}
      style={styles.menuItem}
    >
      <Text style={[styles.menuLabel, isDanger && styles.menuDanger]}>{label}</Text>
      {!isStatic && <Text style={styles.menuArrow}>›</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: Spacing.xxl },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    margin: Spacing.lg,
    padding: Spacing.lg,
  },
  nickname: {
    fontFamily: Fonts.handwriting,
    fontSize: 26,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  pillRow: { flexDirection: 'row', alignItems: 'center' },
  pill: { alignItems: 'center', flex: 1 },
  pillValue: {
    fontFamily: Fonts.handwriting,
    fontSize: 22,
    color: Colors.primary,
    marginBottom: 2,
  },
  pillLabel: { fontSize: 12, color: Colors.textSecondary },
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
    borderBottomWidth: 1,
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
  menuLabel: { fontSize: 15, color: Colors.text },
  menuDanger: { color: Colors.error },
  menuArrow: { fontSize: 18, color: Colors.textTertiary },
});
