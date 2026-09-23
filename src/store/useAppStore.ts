import { create } from 'zustand';
import { PeranUser, AuthUser } from '../types';

interface AppState {
  currentRole: PeranUser;
  currentUser: string;
  authUser: AuthUser | null;
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

const roleDefaultTabs: Record<PeranUser, string> = {
  'Super Admin': 'admin-panel',
  'SA': 'dashboard',
  'Foreman': 'dashboard',
  'Mekanik': 'dashboard',
  'Admin Purchasing': 'dashboard',
  'Admin Invoice': 'dashboard',
  'Security': 'security-dashboard',
  'Customer Fleet': 'fleet-dashboard',
  'PIC Terkait': 'dashboard',
  'Warehouse': 'beli-part',
};

// Initial state from localStorage
const savedToken = typeof localStorage !== 'undefined' ? localStorage.getItem('bengkel_jwt_token') : null;
let initialUser = '';
let initialRole: PeranUser = 'SA';
let initialAuthUser: AuthUser | null = null;

try {
  const savedUserJson = typeof localStorage !== 'undefined' ? localStorage.getItem('bengkel_auth_user') : null;
  if (savedUserJson) {
    const parsed = JSON.parse(savedUserJson);
    initialAuthUser = parsed;
    if (parsed.nama_lengkap) initialUser = parsed.nama_lengkap;
    if (parsed.peran) initialRole = parsed.peran;
  }
} catch (e) {
  console.error('Failed to parse saved auth user:', e);
}

export const useAppStore = create<AppState>((set) => ({
  currentRole: initialRole,
  currentUser: initialUser,
  authUser: initialAuthUser,
  activeTab: roleDefaultTabs[initialRole] || 'dashboard',
  selectedSpkId: null,
  notificationCount: 0,
  mobileMenuOpen: false,
  jwtToken: savedToken,
  isLoggedIn: !!savedToken && !!initialUser,

  setRole: (role: PeranUser, user?: string) => {
    const defaultTab = roleDefaultTabs[role] || 'dashboard';
    set({
      currentRole: role,
      currentUser: user || '',
      activeTab: defaultTab,
      mobileMenuOpen: false,
    });
  },

  loginUser: (user: Partial<AuthUser>, token: string, refreshToken?: string) => {
    const role = (user.peran as PeranUser) || 'SA';
    const defaultTab = roleDefaultTabs[role] || 'dashboard';
    const fullUser = user as AuthUser;
    
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('bengkel_jwt_token', token);
      if (refreshToken) localStorage.setItem('bengkel_refresh_token', refreshToken);
      localStorage.setItem('bengkel_auth_user', JSON.stringify(fullUser));
    }

    set({
      jwtToken: token,
      isLoggedIn: true,
      currentUser: user.nama_lengkap || '',
      authUser: fullUser,
      currentRole: role,
      activeTab: defaultTab,
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
      currentUser: '',
      authUser: null,
    });
  },

  setActiveTab: (tab: string) => set({ activeTab: tab, mobileMenuOpen: false }),
  setSelectedSpkId: (id: number | null) => set({ selectedSpkId: id }),
  setMobileMenuOpen: (open: boolean) => set({ mobileMenuOpen: open }),
  setJwtToken: (token: string | null) => set({ jwtToken: token, isLoggedIn: !!token }),
  decrementNotification: () => set((state) => ({ notificationCount: Math.max(0, state.notificationCount - 1) })),
}));
