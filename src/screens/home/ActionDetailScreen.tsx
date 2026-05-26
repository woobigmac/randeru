import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList } from '../../navigation/HomeStackNavigator';
import { useActionStore } from '../../store/useActionStore';
import { useUserStore } from '../../store/useUserStore';
import { getFriends } from '../../services/friendService';
import { shareActionWithFriend } from '../../services/friendActionService';
import { Header } from '../../components/Header';
import { Tag } from '../../components/Tag';
import { Button } from '../../components/Button';
import { Colors, Fonts, Radius, Spacing } from '../../constants/theme';
import { Friend } from '../../types';

type Props = {
  navigation: StackNavigationProp<HomeStackParamList, 'ActionDetail'>;
  route: RouteProp<HomeStackParamList, 'ActionDetail'>;
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
};

export default function ActionDetailScreen({ navigation, route }: Props) {
  const { action } = route.params;
  const user = useUserStore((s) => s.user);
  const todayRecord = useActionStore((s) => s.todayRecord);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isFriendModalVisible, setIsFriendModalVisible] = useState(false);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [sharingFriendId, setSharingFriendId] = useState<string | null>(null);

  useEffect(() => {
    if (!isFriendModalVisible || !user?.user_id) return;
    setIsLoadingFriends(true);
    getFriends(user.user_id)
      .then(setFriends)
      .catch((error) => {
        console.warn('getFriends error:', error);
        Alert.alert('친구 목록을 불러오지 못했어요', '잠시 후 다시 시도해주세요.');
      })
      .finally(() => setIsLoadingFriends(false));
  }, [isFriendModalVisible, user?.user_id]);

  const handleShareWithFriend = async (friend: Friend) => {
    if (!user) return;
    setSharingFriendId(friend.friend_user_id);
    try {
      await shareActionWithFriend(user, friend, action, todayRecord?.record_id);
      setIsFriendModalVisible(false);
      Alert.alert('공유 완료', `${friend.nickname}님에게 액션을 보냈어요.`);
    } catch (error) {
      console.warn('shareActionWithFriend error:', error);
      Alert.alert('공유 실패', '액션을 공유하지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setSharingFriendId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="오늘의 액션" showBack />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* 제목 */}
        <Text style={styles.title}>{action.title}</Text>

        {/* 태그 행 */}
        <View style={styles.tagRow}>
          <Tag label={DIFFICULTY_LABEL[action.difficulty] ?? action.difficulty} color="gray" />
          <Tag label={`${action.estimated_time}분`} color="purple" />
          <Tag label={`#${action.place_tag}`} color="green" />
        </View>

        {/* 설명 카드 */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>어떤 액션인가요?</Text>
          <Text style={styles.bodyText}>{action.description}</Text>
        </View>

        {/* 방법 카드 */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>어떻게 하면 되나요?</Text>
          <Text style={styles.bodyText}>
            {`1. 주변을 잠깐 둘러보세요.\n2. 지금 바로 실천할 수 있어요. 특별한 준비가 필요 없어요.\n3. 완료 후 사진이나 10초 이내 영상으로 기록해보세요.`}
          </Text>
        </View>

        {/* 안전 안내 */}
        {action.safety_note ? (
          <View style={styles.safetyCard}>
            <Text style={styles.safetyText}>⚠️ {action.safety_note}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* 하단 CTA */}
      <View style={styles.buttonArea}>
        <Button
          label="친구에게 공유하기"
          onPress={() => setIsFriendModalVisible(true)}
          variant="secondary"
          style={styles.secondaryButton}
        />
        <Button
          label="이 액션 시작하기"
          onPress={() => {
            if (todayRecord) {
              navigation.navigate('Photo', { recordId: todayRecord.record_id, action });
            }
          }}
          disabled={!todayRecord}
        />
      </View>

      <Modal
        visible={isFriendModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsFriendModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <Header
            title="친구에게 공유"
            rightElement={
              <TouchableOpacity
                onPress={() => setIsFriendModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            }
          />
          <View style={styles.modalBody}>
            <Text style={styles.modalTitle}>{action.title}</Text>
            <Text style={styles.modalDescription}>
              함께 시작할 친구를 선택해주세요.
            </Text>

            {isLoadingFriends ? (
              <View style={styles.modalCenter}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : friends.length === 0 ? (
              <View style={styles.emptyFriendBox}>
                <Text style={styles.emptyFriendTitle}>아직 친구가 없어요</Text>
                <Text style={styles.emptyFriendText}>
                  마이페이지에서 친구를 초대하면 액션을 함께 보낼 수 있어요.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {friends.map((friend) => (
                  <TouchableOpacity
                    key={friend.friend_user_id}
                    onPress={() => handleShareWithFriend(friend)}
                    disabled={sharingFriendId !== null}
                    activeOpacity={0.75}
                    style={styles.friendItem}
                  >
                    <View style={styles.friendAvatar}>
                      <Text style={styles.friendAvatarText}>
                        {friend.nickname.trim().slice(0, 1) || '란'}
                      </Text>
                    </View>
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>{friend.nickname}</Text>
                      <Text style={styles.friendMeta}>액션 공유하기</Text>
                    </View>
                    {sharingFriendId === friend.friend_user_id ? (
                      <ActivityIndicator color={Colors.primary} />
                    ) : (
                      <Text style={styles.friendArrow}>›</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  title: {
    fontFamily: Fonts.handwriting,
    fontSize: 28,
    color: Colors.text,
    marginBottom: Spacing.md,
    lineHeight: 40,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bodyText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
  },
  safetyCard: {
    backgroundColor: '#FFF8EE',
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  safetyText: {
    fontSize: 13,
    color: Colors.error,
    lineHeight: 20,
  },
  buttonArea: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  secondaryButton: { marginBottom: Spacing.sm },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalBody: { flex: 1, padding: Spacing.lg },
  modalClose: { fontSize: 18, color: Colors.textSecondary },
  modalTitle: {
    fontFamily: Fonts.handwriting,
    fontSize: 24,
    color: Colors.text,
    marginBottom: Spacing.xs,
    lineHeight: 34,
  },
  modalDescription: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.lg },
  modalCenter: { padding: Spacing.xl, alignItems: 'center' },
  emptyFriendBox: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyFriendTitle: {
    fontFamily: Fonts.handwriting,
    fontSize: 18,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptyFriendText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  friendAvatarText: { fontSize: 16, fontWeight: '700', color: Colors.primaryDark },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  friendMeta: { fontSize: 12, color: Colors.textSecondary },
  friendArrow: { fontSize: 22, color: Colors.textTertiary },
});
