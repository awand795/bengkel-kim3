import { create } from 'zustand';
import { PeranUser, AuthUser } from '../types';

interface AppState {
  currentRole: PeranUser;
  currentUser: string;
  activeTab: string;
  selectedSpkId: number | null;
  notificationCount: number;
  mobileMenuOpen: boolean;
  jwtToken: string | null;
  isLoggedIn: boolean;
  
  setRole: (role: PeranUser, user?: string) => void;
  setActiveTab: (tab: string) => void;
  setSelectedSpkId: (id: number | null) => void;
  setMobileMenuOpen: (open: boolean) => void;
  setJwtToken: (token: string | null) => void;
  loginUser: (user: Partial<AuthUser>, token: string, refreshToken?: string) => void;
  logout: () => void;
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

// Initial state from localStorage
const savedToken = typeof localStorage !== 'undefined' ? localStorage.getItem('bengkel_jwt_token') : null;
let initialUser = 'Budi Santoso';
let initialRole: PeranUser = 'SA';

try {
  const savedUserJson = typeof localStorage !== 'undefined' ? localStorage.getItem('bengkel_auth_user') : null;
  if (savedUserJson) {
    const parsed = JSON.parse(savedUserJson);
    if (parsed.nama_lengkap) initialUser = parsed.nama_lengkap;
    if (parsed.peran) initialRole = parsed.peran;
  }
} catch (e) {
  console.error('Failed to parse saved auth user:', e);
}

const initialDefault = roleDefaults[initialRole] || { user: 'User', defaultTab: 'sa' };

export const useAppStore = create<AppState>((set) => ({
  currentRole: initialRole,
  currentUser: initialUser || initialDefault.user,
  activeTab: initialDefault.defaultTab,
  selectedSpkId: null,
  notificationCount: 3,
  mobileMenuOpen: false,
  jwtToken: savedToken,
  isLoggedIn: !!savedToken,

  setRole: (role: PeranUser, user?: string) => {
    const defaultData = roleDefaults[role] || { user: 'User', defaultTab: 'dashboard' };
    set({
      currentRole: role,
      currentUser: user || defaultData.user,
      activeTab: defaultData.defaultTab,
      mobileMenuOpen: false,
    });
  },

  loginUser: (user: Partial<AuthUser>, token: string, refreshToken?: string) => {
    const role = (user.peran as PeranUser) || 'SA';
    const defaultData = roleDefaults[role] || { user: user.nama_lengkap || 'User', defaultTab: 'dashboard' };
    
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('bengkel_jwt_token', token);
      if (refreshToken) localStorage.setItem('bengkel_refresh_token', refreshToken);
      localStorage.setItem('bengkel_auth_user', JSON.stringify(user));
    }

    set({
      jwtToken: token,
      isLoggedIn: true,
      currentUser: user.nama_lengkap || defaultData.user,
      currentRole: role,
      activeTab: defaultData.defaultTab,
    });
  },

  logout: () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('bengkel_jwt_token');
      localStorage.removeItem('bengkel_refresh_token');
      localStorage.removeItem('bengkel_auth_user');
    }
    set({
      jwtToken: null,
      isLoggedIn: false,
    });
  },

  setActiveTab: (tab: string) => set({ activeTab: tab, mobileMenuOpen: false }),
  setSelectedSpkId: (id: number | null) => set({ selectedSpkId: id }),
  setMobileMenuOpen: (open: boolean) => set({ mobileMenuOpen: open }),
  setJwtToken: (token: string | null) => set({ jwtToken: token, isLoggedIn: !!token }),
  decrementNotification: () => set((state) => ({ notificationCount: Math.max(0, state.notificationCount - 1) })),
}));
