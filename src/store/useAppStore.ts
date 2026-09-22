import { create } from 'zustand';
import { PeranUser } from '../types';

interface AppState {
  currentRole: PeranUser;
  currentUser: string;
  activeTab: string;
  selectedSpkId: number | null;
  notificationCount: number;
  mobileMenuOpen: boolean;
  loginModalOpen: boolean;
  jwtToken: string | null;
  isLoggedIn: boolean;
  
  setRole: (role: PeranUser, user?: string) => void;
  setActiveTab: (tab: string) => void;
  setSelectedSpkId: (id: number | null) => void;
  setMobileMenuOpen: (open: boolean) => void;
  setLoginModalOpen: (open: boolean) => void;
  setJwtToken: (token: string | null) => void;
  decrementNotification: () => void;
}

const roleDefaults: Record<PeranUser, { user: string; defaultTab: string }> = {
  'SA': { user: 'Budi Santoso', defaultTab: 'sa' },
  'Foreman': { user: 'Joko Susilo', defaultTab: 'foreman' },
  'Mekanik': { user: 'Andi Wijaya', defaultTab: 'mekanik' },
  'Admin Purchasing': { user: 'Rina Marlina', defaultTab: 'purchasing' },
  'Admin Invoice': { user: 'Siti Rahma', defaultTab: 'kasir' },
  'Security': { user: 'Hisar Pardede', defaultTab: 'security' },
  'Customer Fleet': { user: 'PT. Andi Jaya', defaultTab: 'fleet' },
  'Warehouse': { user: 'Hisar', defaultTab: 'beli-part' },
};

export const useAppStore = create<AppState>((set) => ({
  currentRole: 'SA',
  currentUser: 'Budi Santoso',
  activeTab: 'sa',
  selectedSpkId: null,
  notificationCount: 3,
  mobileMenuOpen: false,
  loginModalOpen: false,
  jwtToken: typeof localStorage !== 'undefined' ? localStorage.getItem('bengkel_jwt_token') : null,
  isLoggedIn: typeof localStorage !== 'undefined' ? !!localStorage.getItem('bengkel_jwt_token') : false,

  setRole: (role: PeranUser, user?: string) => {
    const defaultData = roleDefaults[role] || { user: 'User', defaultTab: 'dashboard' };
    set({
      currentRole: role,
      currentUser: user || defaultData.user,
      activeTab: defaultData.defaultTab,
      mobileMenuOpen: false,
    });
  },

  setActiveTab: (tab: string) => set({ activeTab: tab, mobileMenuOpen: false }),
  setSelectedSpkId: (id: number | null) => set({ selectedSpkId: id }),
  setMobileMenuOpen: (open: boolean) => set({ mobileMenuOpen: open }),
  setLoginModalOpen: (open: boolean) => set({ loginModalOpen: open }),
  setJwtToken: (token: string | null) => set({ jwtToken: token, isLoggedIn: !!token }),
  decrementNotification: () => set((state) => ({ notificationCount: Math.max(0, state.notificationCount - 1) })),
}));
