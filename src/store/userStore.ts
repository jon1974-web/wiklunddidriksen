import { create } from 'zustand';
import { User } from '../types';

interface UserState {
  user: User | null;
  familyId: string | null;
  familyName: string | null;
  setUser: (user: User | null) => void;
  setFamily: (familyId: string | null, familyName: string | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  familyId: null,
  familyName: null,
  setUser: (user) => set({ user }),
  setFamily: (familyId, familyName) => set({ familyId, familyName }),
}));
