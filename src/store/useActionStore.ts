import { Alert } from 'react-native';
import { create } from 'zustand';
import { Action, DailyRecord, ActionStatus, Tone } from '../types';
import {
  getTodayAction,
  getActionById,
  getRandomAction,
  acceptAction,
  reshuffleAction as reshuffleActionService,
} from '../services/actionService';
import { showRewardedAd } from '../services/adService';
import { MAX_RESHUFFLE_COUNT, FREE_RESHUFFLE_COUNT } from '../constants';

interface ActionStoreState {
  todayAction: Action | null;
  todayRecord: DailyRecord | null;
  actionStatus: ActionStatus;
  isLoading: boolean;
  error: string | null;
  needsAdForReshuffle: boolean;

  loadTodayAction: (userId: string) => Promise<void>;
  receiveAction: (userId: string, tones: Tone[]) => Promise<void>;
  reshuffleAction: (userId: string) => Promise<void>;
  reshuffleWithAd: (userId: string) => Promise<void>;
  setActionCompleted: () => void;
  setActionShared: () => void;
}

export const useActionStore = create<ActionStoreState>((set, get) => ({
  todayAction: null,
  todayRecord: null,
  actionStatus: 'not_received',
  isLoading: false,
  error: null,
  needsAdForReshuffle: false,

  loadTodayAction: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const record = await getTodayAction(userId);
      if (!record) {
        set({ actionStatus: 'not_received', todayAction: null, todayRecord: null, isLoading: false });
        return;
      }
      const action = await getActionById(record.action_id);
      set({
        todayRecord: record,
        todayAction: action,
        actionStatus: record.status as ActionStatus,
        isLoading: false,
      });
    } catch (e) {
      console.error('loadTodayAction error:', e);
      set({ error: '액션을 불러오지 못했어요', isLoading: false });
    }
  },

  receiveAction: async (userId, tones) => {
    set({ isLoading: true, error: null });
    try {
      const action = await getRandomAction([], tones);
      if (!action) {
        set({ error: '사용 가능한 액션이 없어요', isLoading: false });
        return;
      }
      const record = await acceptAction(userId, action);
      set({
        todayAction: action,
        todayRecord: record,
        actionStatus: 'accepted',
        isLoading: false,
      });
    } catch (e) {
      console.error('receiveAction error:', e);
      set({ error: '액션을 받아오지 못했어요. 다시 시도해주세요', isLoading: false });
    }
  },

  reshuffleAction: async (_userId) => {
    const { todayRecord, todayAction } = get();
    if (!todayRecord || !todayAction) return;

    const reshuffleCount = todayRecord.reshuffle_count ?? 0;

    // 최대 횟수 초과 시 중단
    if (reshuffleCount >= MAX_RESHUFFLE_COUNT) return;

    // 무료 횟수 소진 시 광고 시청 필요 신호만 세우고 리턴
    if (reshuffleCount >= FREE_RESHUFFLE_COUNT) {
      set({ needsAdForReshuffle: true });
      return;
    }

    // 무료 횟수 내: 바로 재추첨 진행
    set({ isLoading: true, error: null, needsAdForReshuffle: false });
    try {
      const newAction = await getRandomAction([todayAction.action_id], []);
      if (!newAction) {
        set({ error: '다른 액션을 찾지 못했어요', isLoading: false });
        return;
      }
      await reshuffleActionService(todayRecord.record_id, newAction, reshuffleCount);
      set({
        todayAction: newAction,
        todayRecord: {
          ...todayRecord,
          action_id: newAction.action_id,
          reshuffle_count: reshuffleCount + 1,
        },
        isLoading: false,
      });
    } catch (e) {
      console.error('reshuffleAction error:', e);
      set({ error: '재추첨에 실패했어요', isLoading: false });
    }
  },

  reshuffleWithAd: async (_userId) => {
    const { todayRecord, todayAction } = get();
    if (!todayRecord || !todayAction) return;

    const reshuffleCount = todayRecord.reshuffle_count ?? 0;
    if (reshuffleCount >= MAX_RESHUFFLE_COUNT) return;

    set({ isLoading: true, error: null, needsAdForReshuffle: false });
    try {
      const rewarded = await showRewardedAd();
      if (!rewarded) {
        set({ isLoading: false });
        Alert.alert('광고 미완료', '광고를 끝까지 시청해야 추가 재추첨이 가능해요.');
        return;
      }

      const newAction = await getRandomAction([todayAction.action_id], []);
      if (!newAction) {
        set({ error: '다른 액션을 찾지 못했어요', isLoading: false });
        return;
      }
      await reshuffleActionService(todayRecord.record_id, newAction, reshuffleCount);
      set({
        todayAction: newAction,
        todayRecord: {
          ...todayRecord,
          action_id: newAction.action_id,
          reshuffle_count: reshuffleCount + 1,
        },
        isLoading: false,
      });
    } catch (e) {
      console.error('reshuffleWithAd error:', e);
      set({ error: '재추첨에 실패했어요', isLoading: false });
    }
  },

  setActionCompleted: () => {
    const { todayRecord } = get();
    if (!todayRecord) return;
    set({
      actionStatus: 'completed',
      todayRecord: { ...todayRecord, status: 'completed' },
    });
  },

  setActionShared: () => {
    const { todayRecord } = get();
    if (!todayRecord) return;
    set({
      actionStatus: 'shared',
      todayRecord: { ...todayRecord, status: 'shared' },
    });
  },
}));
