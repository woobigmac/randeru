import { Alert } from 'react-native';
import { create } from 'zustand';
import { Action, DailyRecord, ActionStatus, DailySlotStatus, SlotId, Tone } from '../types';
import {
  getTodaySlots,
  getRandomAction,
  acceptSlotAction,
  isFirestoreTimeoutError,
  reshuffleAction as reshuffleActionService,
} from '../services/actionService';
import { showRewardedAd } from '../services/adService';
import { logActionAccepted, logActionReceived, logReshuffle } from '../services/analyticsService';
import { trackActionActivity } from '../services/actionActivityService';
import { DAILY_FREE_RESHUFFLE_COUNT, DAILY_SLOTS, MAX_RESHUFFLE_COUNT } from '../constants';

function getCurrentSlotId(): SlotId {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const totalMin = h * 60 + m;

  if (totalMin >= 19 * 60) return 'evening';
  if (totalMin >= 12 * 60 + 30) return 'lunch';
  if (totalMin >= 7 * 60) return 'morning';
  return 'morning';
}

const TIMEOUT_MSG = '서버 응답이 지연되고 있어요. 네트워크를 확인한 뒤 다시 시도해 주세요.';

interface ActionStoreState {
  todaySlots: DailySlotStatus[];
  activeSlotId: SlotId | null;
  isLoading: boolean;
  isAdLoading: boolean;
  error: string | null;

  // 하위 호환 — CompleteScreen / ShareScreen / PhotoScreen 등에서 사용
  todayAction: Action | null;
  todayRecord: DailyRecord | null;
  actionStatus: ActionStatus;

  loadTodaySlots: (userId: string) => Promise<void>;
  receiveSlotAction: (userId: string, slotId: SlotId) => Promise<void>;
  setActiveSlot: (slotId: SlotId) => void;
  setActionCompleted: (recordUpdates?: Partial<DailyRecord>) => void;
  setActionShared: () => void;

  reshuffleWithAd: (userId: string) => Promise<void>;
}

function deriveFromSlot(slots: DailySlotStatus[], slotId: SlotId | null) {
  const slot = slots.find((s) => s.slot_id === slotId);
  if (!slot) return { todayAction: null, todayRecord: null, actionStatus: 'not_received' as ActionStatus };
  return {
    todayAction: slot.action,
    todayRecord: slot.record,
    actionStatus: (
      slot.status === 'completed' ? 'completed' :
      slot.status === 'accepted' ? 'accepted' :
      'not_received'
    ) as ActionStatus,
  };
}

function hasUsedDailyFreeReshuffle(slots: DailySlotStatus[]): boolean {
  return (
    slots.filter((slot) => slot.record?.free_reshuffle_used === true).length >=
    DAILY_FREE_RESHUFFLE_COUNT
  );
}

export const useActionStore = create<ActionStoreState>((set, get) => ({
  todaySlots: [],
  activeSlotId: null,
  isLoading: false,
  isAdLoading: false,
  error: null,
  todayAction: null,
  todayRecord: null,
  actionStatus: 'not_received',

  loadTodaySlots: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const slots = await getTodaySlots(userId);
      const slotId = getCurrentSlotId();
      set({
        todaySlots: slots,
        activeSlotId: slotId,
        ...deriveFromSlot(slots, slotId),
      });
    } catch (e) {
      console.error('loadTodaySlots error:', e);
      set({ error: isFirestoreTimeoutError(e) ? TIMEOUT_MSG : '슬롯을 불러오지 못했어요' });
    } finally {
      set({ isLoading: false });
    }
  },

  receiveSlotAction: async (userId, slotId) => {
    if (get().isLoading) return;

    set({ isLoading: true, error: null });
    try {
      const { todaySlots } = get();
      const usedIds = todaySlots
        .filter((s) => s.action !== null)
        .map((s) => s.action!.action_id);

      const action = await getRandomAction(usedIds, []);
      if (!action) {
        set({ error: '사용 가능한 액션이 없어요' });
        return;
      }
      const record = await acceptSlotAction(userId, action, slotId);
      logActionReceived(action.action_id, action.category);
      logActionAccepted(action.action_id, action.category);
      trackActionActivity(userId, action, 'received', { record_id: record.record_id, slot_id: slotId });
      trackActionActivity(userId, action, 'accepted', { record_id: record.record_id, slot_id: slotId });

      const updatedSlots = todaySlots.map((s) =>
        s.slot_id === slotId
          ? { ...s, record, action, status: 'accepted' as const }
          : s,
      );

      set({
        todaySlots: updatedSlots,
        ...deriveFromSlot(updatedSlots, slotId),
      });
    } catch (e) {
      console.error('receiveSlotAction error:', e);
      set({ error: isFirestoreTimeoutError(e) ? TIMEOUT_MSG : '액션을 받아오지 못했어요' });
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveSlot: (slotId) => {
    const { todaySlots } = get();
    set({ activeSlotId: slotId, ...deriveFromSlot(todaySlots, slotId) });
  },

  setActionCompleted: (recordUpdates = {}) => {
    const { todaySlots, activeSlotId } = get();
    if (!activeSlotId) return;
    const updatedSlots = todaySlots.map((s) =>
      s.slot_id === activeSlotId && s.record
        ? {
            ...s,
            status: 'completed' as const,
            record: { ...s.record, ...recordUpdates, status: 'completed' as const },
          }
        : s,
    );
    set({
      todaySlots: updatedSlots,
      actionStatus: 'completed',
      todayRecord: updatedSlots.find((s) => s.slot_id === activeSlotId)?.record ?? null,
    });
  },

  setActionShared: () => {
    const { todaySlots, activeSlotId } = get();
    if (!activeSlotId) return;
    const updatedSlots = todaySlots.map((s) =>
      s.slot_id === activeSlotId && s.record
        ? {
            ...s,
            status: 'completed' as const,
            record: { ...s.record, status: 'shared' as const },
          }
        : s,
    );
    set({
      todaySlots: updatedSlots,
      actionStatus: 'shared',
      todayRecord: updatedSlots.find((s) => s.slot_id === activeSlotId)?.record ?? null,
    });
  },

  reshuffleWithAd: async (userId) => {
    if (get().isLoading || get().isAdLoading) return;

    const { todaySlots, activeSlotId } = get();
    if (!activeSlotId) return;
    const activeSlot = todaySlots.find((s) => s.slot_id === activeSlotId);
    if (!activeSlot?.record || !activeSlot?.action) return;

    const reshuffleCount = activeSlot.record.reshuffle_count ?? 0;
    if (reshuffleCount >= MAX_RESHUFFLE_COUNT) return;
    const useFreeReshuffle = !hasUsedDailyFreeReshuffle(todaySlots);

    set({ isAdLoading: !useFreeReshuffle, isLoading: useFreeReshuffle, error: null });
    try {
      if (!useFreeReshuffle) {
        const rewarded = await showRewardedAd();
        if (!rewarded) {
          Alert.alert('재추첨 불가', '광고를 끝까지 시청하거나\n네트워크 연결을 확인해 주세요.');
          return;
        }
      }

      set({ isAdLoading: false, isLoading: true });
      const usedIds = todaySlots.filter((s) => s.action).map((s) => s.action!.action_id);
      const newAction = await getRandomAction(usedIds, []);
      if (!newAction) {
        set({ error: '다른 액션을 찾지 못했어요' });
        return;
      }
      await reshuffleActionService(
        activeSlot.record.record_id,
        newAction,
        reshuffleCount,
        !useFreeReshuffle,
      );
      logReshuffle(reshuffleCount + 1, !useFreeReshuffle, activeSlot.action);
      trackActionActivity(userId, activeSlot.action, 'reshuffled', {
        record_id: activeSlot.record.record_id,
        slot_id: activeSlotId,
        reshuffle_count: reshuffleCount + 1,
        used_ad: !useFreeReshuffle,
        next_action_id: newAction.action_id,
      });
      logActionReceived(newAction.action_id, newAction.category);
      logActionAccepted(newAction.action_id, newAction.category);
      trackActionActivity(userId, newAction, 'received', {
        record_id: activeSlot.record.record_id,
        slot_id: activeSlotId,
      });
      trackActionActivity(userId, newAction, 'accepted', {
        record_id: activeSlot.record.record_id,
        slot_id: activeSlotId,
      });
      const updatedRecord = {
        ...activeSlot.record,
        action_id: newAction.action_id,
        reshuffle_count: reshuffleCount + 1,
        ...(useFreeReshuffle
          ? { free_reshuffle_used: true }
          : { ad_reshuffle_count: (activeSlot.record.ad_reshuffle_count ?? 0) + 1 }),
      };
      const updatedSlots = todaySlots.map((s) =>
        s.slot_id === activeSlotId
          ? { ...s, action: newAction, record: updatedRecord }
          : s,
      );
      set({ todaySlots: updatedSlots, todayAction: newAction, todayRecord: updatedRecord });
    } catch (e) {
      console.error('reshuffleWithAd error:', e);
      set({ error: isFirestoreTimeoutError(e) ? TIMEOUT_MSG : '재추첨에 실패했어요' });
    } finally {
      set({ isLoading: false, isAdLoading: false });
    }
  },
}));
