import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_INVITE_KEY = 'pendingInviteCode';

export function savePendingInviteCode(code: string): Promise<void> {
  return AsyncStorage.setItem(PENDING_INVITE_KEY, code);
}

export function loadPendingInviteCode(): Promise<string | null> {
  return AsyncStorage.getItem(PENDING_INVITE_KEY);
}

export function clearPendingInviteCode(): Promise<void> {
  return AsyncStorage.removeItem(PENDING_INVITE_KEY);
}
