import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { useUserStore } from '../../store/useUserStore';
import { MyPageStackParamList } from '../../navigation/MyPageStackNavigator';
import { getActionById } from '../../services/actionService';
import {
  acceptFriendInvite,
  createFriendInvite,
  FriendInviteError,
  getFriends,
  getInviteShareMessage,
  getSentFriendInvites,
} from '../../services/friendService';
import {
  getReceivedActionShares,
  getSentActionShares,
  startReceivedActionShare,
} from '../../services/friendActionService';
import { Friend, FriendActionShare, FriendInvite } from '../../types';
import { Colors, Fonts, Radius, Spacing } from '../../constants/theme';

type Props = {
  navigation: StackNavigationProp<MyPageStackParamList, 'Friends'>;
  route: RouteProp<MyPageStackParamList, 'Friends'>;
};

type FriendManageSection = 'friends' | 'receivedActions' | 'sentActions' | 'sentInvites';

const FRIEND_SECTION_LABEL: Record<FriendManageSection, string> = {
  friends: '내 친구',
  receivedActions: '받은 액션',
  sentActions: '보낸 액션',
  sentInvites: '보낸 초대',
};

function getInitial(name: string): string {
  return name.trim().slice(0, 1) || '랜';
}

function formatInviteStatus(invite: FriendInvite): string {
  if (invite.status === 'accepted') {
    return invite.accepted_by_nickname
      ? `${invite.accepted_by_nickname}님 등록 완료`
      : '등록 완료';
  }
  if (invite.status === 'expired') return '만료됨';
  return '대기 중';
}

function getInviteErrorMessage(error: unknown): string {
  if (error instanceof FriendInviteError) return error.message;
  return '친구 등록에 실패했어요. 잠시 후 다시 시도해주세요.';
}

function getActionShareStatusLabel(status: FriendActionShare['status']): string {
  switch (status) {
    case 'sent':
    case 'opened':
      return '대기 중';
    case 'started':
      return '진행 중';
    case 'completed':
      return '완료';
    case 'cancelled':
      return '취소됨';
    default:
      return '대기 중';
  }
}

function getActionShareStatusStyle(status: FriendActionShare['status']) {
  if (status === 'completed') return styles.statusCompleted;
  if (status === 'started') return styles.statusStarted;
  return styles.statusPending;
}

export default function FriendsScreen({ navigation, route }: Props) {
  const user = useUserStore((state) => state.user);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [sentInvites, setSentInvites] = useState<FriendInvite[]>([]);
  const [receivedActionShares, setReceivedActionShares] = useState<FriendActionShare[]>([]);
  const [sentActionShares, setSentActionShares] = useState<FriendActionShare[]>([]);
  const [activeInvite, setActiveInvite] = useState<FriendInvite | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [isAcceptingInvite, setIsAcceptingInvite] = useState(false);
  const [startingShareId, setStartingShareId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<FriendManageSection>('friends');

  const latestPendingInvite = useMemo(
    () => sentInvites.find((invite) => invite.status === 'pending') ?? null,
    [sentInvites],
  );

  const sectionCounts: Record<FriendManageSection, number> = {
    friends: friends.length,
    receivedActions: receivedActionShares.length,
    sentActions: sentActionShares.length,
    sentInvites: sentInvites.length,
  };

  const loadFriendsData = useCallback(async () => {
    if (!user?.user_id) return;
    setIsLoading(true);
    try {
      const [nextFriends, nextInvites, nextReceivedShares, nextSentShares] = await Promise.all([
        getFriends(user.user_id),
        getSentFriendInvites(user.user_id),
        getReceivedActionShares(user.user_id),
        getSentActionShares(user.user_id),
      ]);
      setFriends(nextFriends);
      setSentInvites(nextInvites);
      setReceivedActionShares(nextReceivedShares);
      setSentActionShares(nextSentShares);
      setActiveInvite((current) => current ?? nextInvites.find((i) => i.status === 'pending') ?? null);
    } catch (error) {
      console.warn('loadFriendsData error:', error);
      Alert.alert('친구 정보를 불러오지 못했어요', '네트워크를 확인한 뒤 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.user_id]);

  useEffect(() => {
    void loadFriendsData();
  }, [loadFriendsData]);

  useFocusEffect(
    useCallback(() => {
      void loadFriendsData();
    }, [loadFriendsData]),
  );

  const inviteToShow = activeInvite ?? latestPendingInvite;

  const handleCreateInvite = async () => {
    if (!user) return;
    setIsCreatingInvite(true);
    try {
      const invite = await createFriendInvite(user);
      setActiveInvite(invite);
      setSentInvites((prev) => [invite, ...prev]);
      await Share.share({ message: getInviteShareMessage(invite) });
    } catch (error) {
      console.warn('createFriendInvite error:', error);
      Alert.alert('초대 코드를 만들지 못했어요', '잠시 후 다시 시도해주세요.');
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleShareInvite = async () => {
    if (!inviteToShow) return;
    await Share.share({ message: getInviteShareMessage(inviteToShow) });
  };

  const handleCopyInvite = async () => {
    if (!inviteToShow) return;
    await Clipboard.setStringAsync(inviteToShow.invite_code);
    Alert.alert('초대 코드 복사 완료', '친구에게 코드를 보내주세요.');
  };

  const acceptInviteCode = async (code: string) => {
    if (!user) return;
    setIsAcceptingInvite(true);
    try {
      const friend = await acceptFriendInvite(code, user);
      setInviteCode('');
      Alert.alert('친구 등록 완료', `${friend.nickname}님과 친구가 되었어요.`);
      await loadFriendsData();
    } catch (error) {
      console.warn('acceptFriendInvite error:', error);
      Alert.alert('친구 등록 실패', getInviteErrorMessage(error));
    } finally {
      setIsAcceptingInvite(false);
    }
  };

  const handleAcceptInvite = async () => {
    await acceptInviteCode(inviteCode);
  };

  useEffect(() => {
    const linkedInviteCode = route.params?.inviteCode;
    if (!linkedInviteCode || !user) return;

    setInviteCode(linkedInviteCode);
    navigation.setParams({ inviteCode: undefined });
    Alert.alert(
      '친구 초대 도착',
      `초대 코드 ${linkedInviteCode}로 친구를 등록할까요?`,
      [
        { text: '나중에', style: 'cancel' },
        { text: '등록', onPress: () => acceptInviteCode(linkedInviteCode) },
      ],
    );
  }, [navigation, route.params?.inviteCode, user]);

  const handleStartActionShare = async (share: FriendActionShare) => {
    if (!user) return;
    setStartingShareId(share.share_id);
    try {
      const action = await getActionById(share.action_id);
      if (!action) {
        Alert.alert('액션을 찾지 못했어요', '잠시 후 다시 시도해주세요.');
        return;
      }

      const record = share.status === 'started' && share.record_id
        ? { record_id: share.record_id }
        : await startReceivedActionShare(share, user);

      await loadFriendsData();
      navigation.navigate('Photo', {
        recordId: record.record_id,
        action,
        friendActionShareId: share.share_id,
      });
    } catch (error) {
      console.warn('startReceivedActionShare error:', error);
      const message = error instanceof Error
        ? error.message
        : '공유받은 액션을 시작하지 못했어요.';
      Alert.alert('시작 실패', message);
    } finally {
      setStartingShareId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="친구" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.invitePanel}>
          <Text style={styles.panelTitle}>친구 초대</Text>
          <Text style={styles.panelDescription}>
            초대 코드를 보내면 친구와 함께 액션을 시작하고, 함께한 기록을 남길 수 있어요.
          </Text>

          {inviteToShow ? (
            <View style={styles.inviteCodeBox}>
              <Text style={styles.inviteCodeLabel}>초대 코드</Text>
              <Text style={styles.inviteCode}>{inviteToShow.invite_code}</Text>
            </View>
          ) : null}

          <View style={styles.buttonRow}>
            <Button
              label={inviteToShow ? '새 초대 만들기' : '초대 만들기'}
              onPress={handleCreateInvite}
              loading={isCreatingInvite}
              style={styles.flexButton}
            />
            {inviteToShow ? (
              <Button
                label="공유"
                onPress={handleShareInvite}
                variant="secondary"
                style={styles.smallButton}
              />
            ) : null}
          </View>
          {inviteToShow ? (
            <TouchableOpacity onPress={handleCopyInvite} style={styles.copyButton}>
              <Text style={styles.copyButtonText}>코드 복사하기</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.acceptPanel}>
          <Text style={styles.panelTitle}>초대 코드 입력</Text>
          <View style={styles.codeInputRow}>
            <TextInput
              value={inviteCode}
              onChangeText={setInviteCode}
              placeholder="예: A7B9CD2E"
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.codeInput}
              placeholderTextColor={Colors.textTertiary}
            />
            <Button
              label="등록"
              onPress={handleAcceptInvite}
              loading={isAcceptingInvite}
              disabled={!inviteCode.trim()}
              style={styles.acceptButton}
            />
          </View>
        </View>

        <View style={styles.segmentHeader}>
          <View style={styles.segmentedControl}>
            {(Object.keys(FRIEND_SECTION_LABEL) as FriendManageSection[]).map((section) => {
              const isActive = activeSection === section;
              return (
                <TouchableOpacity
                  key={section}
                  onPress={() => setActiveSection(section)}
                  style={[styles.segmentButton, isActive && styles.segmentButtonActive]}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[styles.segmentButtonText, isActive && styles.segmentButtonTextActive]}
                    numberOfLines={1}
                  >
                    {FRIEND_SECTION_LABEL[section]}
                  </Text>
                  <Text
                    style={[styles.segmentCountText, isActive && styles.segmentButtonTextActive]}
                    numberOfLines={1}
                  >
                    {sectionCounts[section]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {isLoading ? <ActivityIndicator color={Colors.primary} /> : null}
        </View>

        {activeSection === 'friends' ? (
          friends.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>아직 등록된 친구가 없어요</Text>
              <Text style={styles.emptyText}>첫 친구를 초대해서 함께 액션을 시작해보세요.</Text>
            </View>
          ) : (
            <View style={styles.friendList}>
              {friends.map((friend) => (
                <View key={friend.friend_user_id} style={styles.friendItem}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitial(friend.nickname)}</Text>
                  </View>
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{friend.nickname}</Text>
                    <Text style={styles.friendMeta}>함께한 액션 기록 준비 중</Text>
                  </View>
                </View>
              ))}
            </View>
          )
        ) : null}

        {activeSection === 'receivedActions' ? (
          receivedActionShares.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>받은 액션이 없어요</Text>
              <Text style={styles.emptyText}>친구가 함께할 액션을 보내면 여기에 표시돼요.</Text>
            </View>
          ) : (
            <View style={styles.receivedActions}>
              {receivedActionShares.map((share) => (
                <View key={share.share_id} style={styles.actionShareItem}>
                  <View style={styles.actionShareTextArea}>
                    <Text style={styles.actionShareTitle} numberOfLines={1}>
                      {share.action_title}
                    </Text>
                    <Text style={styles.actionShareMeta} numberOfLines={1}>
                      {share.sender_nickname}님이 함께하자고 보냈어요
                    </Text>
                  </View>
                  <Button
                    label={share.status === 'started' ? '인증' : '시작'}
                    onPress={() => handleStartActionShare(share)}
                    loading={startingShareId === share.share_id}
                    disabled={startingShareId !== null}
                    style={styles.startActionButton}
                  />
                </View>
              ))}
            </View>
          )
        ) : null}

        {activeSection === 'sentActions' ? (
          sentActionShares.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>보낸 액션이 없어요</Text>
              <Text style={styles.emptyText}>액션 상세에서 친구에게 함께하기를 보내보세요.</Text>
            </View>
          ) : (
            <View style={styles.sentActions}>
              {sentActionShares.map((share) => (
                <View key={share.share_id} style={styles.sentActionItem}>
                  <View style={styles.actionShareTextArea}>
                    <Text style={styles.actionShareTitle} numberOfLines={1}>
                      {share.action_title}
                    </Text>
                    <Text style={styles.actionShareMeta} numberOfLines={1}>
                      {share.recipient_nickname}님에게 보냈어요
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, getActionShareStatusStyle(share.status)]}>
                    <Text style={styles.statusBadgeText}>
                      {getActionShareStatusLabel(share.status)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )
        ) : null}

        {activeSection === 'sentInvites' ? (
          sentInvites.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>보낸 초대가 없어요</Text>
              <Text style={styles.emptyText}>친구 초대를 만들면 초대 상태를 확인할 수 있어요.</Text>
            </View>
          ) : (
            <View style={styles.sentInvites}>
              {sentInvites.map((invite) => (
                <View key={invite.invite_id} style={styles.inviteHistoryItem}>
                  <Text style={styles.inviteHistoryCode}>{invite.invite_code}</Text>
                  <Text style={styles.inviteHistoryStatus}>{formatInviteStatus(invite)}</Text>
                </View>
              ))}
            </View>
          )
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  invitePanel: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  acceptPanel: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  panelTitle: {
    fontFamily: Fonts.handwriting,
    fontSize: 20,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  panelDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  inviteCodeBox: {
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inviteCodeLabel: { fontSize: 11, color: Colors.textTertiary, marginBottom: 2 },
  inviteCode: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primaryDark,
    letterSpacing: 1.5,
  },
  buttonRow: { flexDirection: 'row', gap: Spacing.sm },
  flexButton: { flex: 1 },
  smallButton: { width: 92 },
  copyButton: { alignSelf: 'center', paddingTop: Spacing.sm },
  copyButtonText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  codeInputRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  codeInput: {
    flex: 1,
    height: 52,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
    color: Colors.text,
  },
  acceptButton: { width: 88 },
  segmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  segmentedControl: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segmentButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  segmentButtonActive: {
    backgroundColor: Colors.primary,
  },
  segmentButtonText: {
    maxWidth: '100%',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  segmentCountText: {
    maxWidth: '100%',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 1,
  },
  segmentButtonTextActive: { color: Colors.white },
  emptyBox: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: Fonts.handwriting,
    fontSize: 18,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptyText: { fontSize: 13, color: Colors.textSecondary },
  friendList: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: Colors.primaryDark },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  friendMeta: { fontSize: 12, color: Colors.textSecondary },
  sentInvites: { gap: Spacing.xs },
  sentActions: { gap: Spacing.xs },
  receivedActions: { gap: Spacing.xs },
  actionShareItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  actionShareTextArea: { flex: 1 },
  actionShareTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 3 },
  actionShareMeta: { fontSize: 12, color: Colors.textSecondary },
  startActionButton: { width: 80, height: 42, paddingHorizontal: 0 },
  sentActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  statusBadge: {
    minWidth: 58,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
    alignItems: 'center',
  },
  statusPending: { backgroundColor: Colors.surface },
  statusStarted: { backgroundColor: Colors.primaryLight },
  statusCompleted: { backgroundColor: '#DDEEDB' },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.primaryDark },
  inviteHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  inviteHistoryCode: { fontSize: 13, fontWeight: '700', color: Colors.text },
  inviteHistoryStatus: { fontSize: 12, color: Colors.textSecondary },
});
