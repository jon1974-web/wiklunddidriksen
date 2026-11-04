import { create } from 'zustand';

interface ChatState {
  inputFocused: boolean;
  setInputFocused: (focused: boolean) => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  inputFocused: false,
  setInputFocused: (focused) => set({ inputFocused: focused }),
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count <= 0 ? 0 : count }),
}));
