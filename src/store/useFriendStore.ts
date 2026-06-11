import { create } from 'zustand';
import { getReceivedActionShares } from '../services/friendActionService';

interface FriendStore {
  receivedActionCount: number;
  loadReceivedActionCount: (userId: string) => Promise<void>;
}

export const useFriendStore = create<FriendStore>((set) => ({
  receivedActionCount: 0,
  loadReceivedActionCount: async (userId: string) => {
    try {
      const shares = await getReceivedActionShares(userId);
      set({ receivedActionCount: shares.length });
    } catch {
      // 배지/배너는 부가 기능이므로 조용히 실패
    }
  },
}));
