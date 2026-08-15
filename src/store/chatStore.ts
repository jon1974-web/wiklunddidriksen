import { create } from 'zustand';

interface ChatState {
  inputFocused: boolean;
  setInputFocused: (focused: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  inputFocused: false,
  setInputFocused: (focused) => set({ inputFocused: focused }),
}));
