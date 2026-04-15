import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useUserStore } from '../../store/useUserStore';
import { useRecordStore } from '../../store/useRecordStore';
import { MyPageStackParamList } from '../../navigation/MyPageStackNavigator';
import { TONES, APP_VERSION } from '../../constants';
import { useEffect } from 'react';

type Props = {
  navigation: StackNavigationProp<MyPageStackParamList, 'MyPageMain'>;
};

export default function MyPageScreen({ navigation }: Props) {
  const user = useUserStore((s) => s.user);
  const clearUser = useUserStore((s) => s.clearUser);
  const { stats, loadRecords } = useRecordStore();

  useEffect(() => {
    if (user?.user_id) {
      loadRecords(user.user_id);
    }
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
          await clearUser();
          // clearUser가 isOnboardingComplete를 false로 설정하면
          // RootNavigator가 자동으로 OnboardingNavigator로 전환
        },
      },
    ]);
  };

  const handleNotImplemented = () => {
    Alert.alert('준비 중', '준비 중입니다.');
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }}>
      {/* 프로필 */}
      <View style={{ padding: 24, paddingTop: 40, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 4 }}>
          {user?.nickname ?? ''}
        </Text>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
          <Text style={{ fontSize: 14, color: '#555' }}>
            누적 <Text style={{ fontWeight: 'bold', color: '#000' }}>{stats.totalCount}번</Text>
          </Text>
          <Text style={{ fontSize: 14, color: '#555' }}>
            {stats.streakDays > 0 ? (
              <>
                <Text style={{ fontWeight: 'bold', color: '#000' }}>{stats.streakDays}일</Text>{' '}
                연속
              </>
            ) : (
              '연속 기록 없음'
            )}
          </Text>
        </View>
      </View>

      {/* 관심 톤 */}
      <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#888', marginBottom: 10 }}>
          관심 톤
        </Text>
        {toneLabels.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {toneLabels.map((label) => (
              <View
                key={label}
                style={{
                  paddingVertical: 4,
                  paddingHorizontal: 12,
                  backgroundColor: '#f0f0f0',
                  borderRadius: 14,
                }}
              >
                <Text style={{ fontSize: 13 }}>{label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View>
            <Text style={{ fontSize: 14, color: '#888', marginBottom: 12 }}>
              관심 톤을 아직 정하지 않았어요
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('ToneSelect')}
              style={{ alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1.5, borderColor: '#000', borderRadius: 8 }}
            >
              <Text style={{ fontSize: 13, fontWeight: 'bold' }}>관심 톤 정하러 가기</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 메뉴 */}
      <View style={{ paddingTop: 8 }}>
        <MenuItem label="설정" onPress={() => navigation.navigate('Setting')} />
        <MenuItem label="알림 설정" onPress={() => navigation.navigate('NotificationSetting')} />
        <MenuItem label="이용약관" onPress={handleNotImplemented} />
        <MenuItem label="개인정보처리방침" onPress={handleNotImplemented} />
        <MenuItem label="문의하기" onPress={handleNotImplemented} />
        <MenuItem label={`앱 버전 ${APP_VERSION}`} isStatic />
        <MenuItem label="로그아웃" onPress={handleLogout} isDanger />
      </View>
    </ScrollView>
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
