import { create } from 'zustand';

interface AIAssistantState {
  /** Assistant requested open (merged with App-level toggle) */
  open: boolean;
  /** Seeded prompt text; the assistant sends it on open */
  prompt: string;
  /** Bump to force a new seeded send for repeated prompts */
  requestId: number;
  openAssistant: (prompt?: string) => void;
  closeAssistant: () => void;
}

export const useAIAssistantStore = create<AIAssistantState>((set) => ({
  open: false,
  prompt: '',
  requestId: 0,
  openAssistant: (prompt) => set((s) => ({ open: true, prompt: prompt || '', requestId: s.requestId + 1 })),
  closeAssistant: () => set({ open: false, prompt: '' }),
}));
