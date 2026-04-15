import { create } from 'zustand';
import { Action, DailyRecord, ActionStatus, Tone } from '../types';
import {
  getTodayAction,
  getActionById,
  getRandomAction,
  acceptAction,
  reshuffleAction as reshuffleActionService,
} from '../services/actionService';
import { MAX_RESHUFFLE_COUNT } from '../constants';

interface ActionStoreState {
  todayAction: Action | null;
  todayRecord: DailyRecord | null;
  actionStatus: ActionStatus;
  isLoading: boolean;
  error: string | null;

  loadTodayAction: (userId: string) => Promise<void>;
  receiveAction: (userId: string, tones: Tone[]) => Promise<void>;
  reshuffleAction: (userId: string) => Promise<void>;
  setActionCompleted: () => void;
  setActionShared: () => void;
}

export const useActionStore = create<ActionStoreState>((set, get) => ({
  todayAction: null,
  todayRecord: null,
  actionStatus: 'not_received',
  isLoading: false,
  error: null,

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
    if (todayRecord.reshuffle_count >= MAX_RESHUFFLE_COUNT) return;

    set({ isLoading: true, error: null });
    try {
      const newAction = await getRandomAction([todayAction.action_id], []);
      if (!newAction) {
        set({ error: '다른 액션을 찾지 못했어요', isLoading: false });
        return;
      }
      await reshuffleActionService(todayRecord.record_id, newAction, todayRecord.reshuffle_count);
      set({
        todayAction: newAction,
        todayRecord: {
          ...todayRecord,
          action_id: newAction.action_id,
          reshuffle_count: todayRecord.reshuffle_count + 1,
        },
        isLoading: false,
      });
    } catch (e) {
      console.error('reshuffleAction error:', e);
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
