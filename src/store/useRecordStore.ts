import { create } from 'zustand';
import { Action, DailyRecord } from '../types';
import { getUserRecords, getRecordWithAction, getUserStats } from '../services/recordService';

export interface RecordWithAction {
  record: DailyRecord;
  action: Action;
}

interface RecordStoreState {
  // 기존 상태 유지 (useActionStore 등에서 참조)
  todayRecord: DailyRecord | null;
  records: DailyRecord[];
  setTodayRecord: (record: DailyRecord) => void;
  setRecords: (records: DailyRecord[]) => void;
  updateTodayRecord: (data: Partial<DailyRecord>) => void;
  clearTodayRecord: () => void;

  // Sprint 5
  recordsWithActions: RecordWithAction[];
  stats: { totalCount: number; streakDays: number };
  isLoading: boolean;

  loadRecords: (userId: string) => Promise<void>;
  getRecordsWithActions: () => RecordWithAction[];
}

export const useRecordStore = create<RecordStoreState>((set, get) => ({
  todayRecord: null,
  records: [],

  setTodayRecord: (record) => set({ todayRecord: record }),
  setRecords: (records) => set({ records }),
  updateTodayRecord: (data) =>
    set((state) => ({
      todayRecord: state.todayRecord ? { ...state.todayRecord, ...data } : null,
    })),
  clearTodayRecord: () => set({ todayRecord: null }),

  recordsWithActions: [],
  stats: { totalCount: 0, streakDays: 0 },
  isLoading: false,

  loadRecords: async (userId) => {
    set({ isLoading: true });
    try {
      const [rawRecords, stats] = await Promise.all([
        getUserRecords(userId),
        getUserStats(userId),
      ]);
      const recordsWithActions = await Promise.all(
        rawRecords.map((r) => getRecordWithAction(r)),
      );
      set({ recordsWithActions, stats, isLoading: false });
    } catch (e) {
      console.error('loadRecords error:', e);
      set({ isLoading: false });
    }
  },

  getRecordsWithActions: () => get().recordsWithActions,
}));
