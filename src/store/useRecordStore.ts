import { create } from 'zustand';
import { Record } from '../types';

interface RecordState {
  todayRecord: Record | null;
  records: Record[];
  setTodayRecord: (record: Record) => void;
  setRecords: (records: Record[]) => void;
  updateTodayRecord: (data: Partial<Record>) => void;
  clearTodayRecord: () => void;
}

export const useRecordStore = create<RecordState>((set) => ({
  todayRecord: null,
  records: [],

  setTodayRecord: (record) => set({ todayRecord: record }),

  setRecords: (records) => set({ records }),

  updateTodayRecord: (data) =>
    set((state) => ({
      todayRecord: state.todayRecord ? { ...state.todayRecord, ...data } : null,
    })),

  clearTodayRecord: () => set({ todayRecord: null }),
}));
