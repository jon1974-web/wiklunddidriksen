import { create } from 'zustand';
import { User } from '../types';

type FamilyRole = 'owner' | 'admin' | 'member';

interface UserState {
  user: User | null;
  familyId: string | null;
  familyName: string | null;
  familyRole: FamilyRole | null;
  pendingInviteCode: string | null;
  pendingInviteFamilyName: string | null;
  setUser: (user: User | null) => void;
  setFamily: (familyId: string | null, familyName: string | null, familyRole?: FamilyRole | null) => void;
  setPendingInviteCode: (code: string | null, familyName?: string | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  familyId: null,
  familyName: null,
  familyRole: null,
  pendingInviteCode: null,
  pendingInviteFamilyName: null,
  setUser: (user) => set({ user }),
  setFamily: (familyId, familyName, familyRole = null) => set({ familyId, familyName, familyRole }),
  setPendingInviteCode: (pendingInviteCode, pendingInviteFamilyName = null) => set({ pendingInviteCode, pendingInviteFamilyName }),
}));
