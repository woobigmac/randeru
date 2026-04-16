import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useUserStore } from '../../store/useUserStore';
import { MyPageStackParamList } from '../../navigation/MyPageStackNavigator';
import { APP_VERSION } from '../../constants';
import { Colors, Radius, Spacing } from '../../constants/theme';

type Props = {
  navigation: StackNavigationProp<MyPageStackParamList, 'Setting'>;
};

const NICKNAME_REGEX = /^[가-힣a-zA-Z0-9]{2,10}$/;

export default function SettingScreen({ navigation }: Props) {
  const user = useUserStore((s) => s.user);
  const setNickname = useUserStore((s) => s.setNickname);
  const clearUser = useUserStore((s) => s.clearUser);

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
              if (user?.user_id) await deleteDoc(doc(db, 'users', user.user_id));
            } catch (e) {
              console.warn('deleteDoc error:', e);
            } finally {
              await clearUser();
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.menuSection}>
          <SettingItem label="닉네임 수정" onPress={handleEditNickname} />
          <SettingItem label="알림 설정" onPress={() => navigation.navigate('NotificationSetting')} />
          <SettingItem label="이용약관" onPress={() => Alert.alert('준비 중', '준비 중입니다.')} />
          <SettingItem label="개인정보처리방침" onPress={() => Alert.alert('준비 중', '준비 중입니다.')} />
          <SettingItem label={`앱 버전 ${APP_VERSION}`} isStatic />
          <SettingItem label="탈퇴하기" onPress={handleDeleteAccount} isDanger />
        </View>
      </ScrollView>
    </SafeAreaView>
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
      style={styles.item}
    >
      <Text style={[styles.label, isDanger && styles.labelDanger]}>{label}</Text>
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
    borderBottomWidth: 1,
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
  label: { fontSize: 15, color: Colors.text },
  labelDanger: { color: Colors.error },
  arrow: { fontSize: 18, color: Colors.textTertiary },
});
