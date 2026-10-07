import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { 
  LogOut, 
  ArrowLeft, 
  User, 
  X, 
  Building2, 
  Mail, 
  CheckCircle2,
  Sun,
  Moon
} from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
import { ProfileModal } from './ProfileModal';
import { FloatingNotificationToast } from '../common/FloatingNotificationToast';

const TAB_TITLES: Record<string, { title: string; subtitle?: string }> = {
  'fleet-dashboard': { title: 'Dashboard', subtitle: 'Web Fleet Customer' },
  'dashboard': { title: 'Dashboard', subtitle: 'Web Fleet Customer' },
  'fleet-booking': { title: 'Booking Service', subtitle: 'Pemesanan Jadwal Servis' },
  'fleet-status': { title: 'Status Service', subtitle: 'Live Tracking Perawatan' },
  'fleet-history': { title: 'History Service', subtitle: 'Riwayat Servis Kendaraan' },
  'fleet-kendaraan': { title: 'Kendaraan Saya', subtitle: 'Kelola Data Armada' },
  'fleet-dokumen': { title: 'Dokumen Saya', subtitle: 'Berkas Legalitas Kendaraan' },
  'fleet-profil': { title: 'Profil Perusahaan', subtitle: 'Informasi Mitra' },
};

export const Navbar: React.FC = () => {
  const { currentUser, authUser, activeTab, setActiveTab, logout, theme, toggleTheme } = useAppStore();
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const defaultTab = 'fleet-dashboard';
  const isRootTab = activeTab === defaultTab || activeTab === 'dashboard';

  const currentInfo = TAB_TITLES[activeTab] || {
    title: activeTab.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    subtitle: 'Web Fleet Customer',
  };

  const handleBack = () => {
    setActiveTab(defaultTab);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-surface-raised border-b border-[#E2E8F0] dark:border-border font-sans safe-top shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {/* Mobile Header (< 768px) */}
        <div className="flex md:hidden items-center justify-between px-3 h-14">
          <div className="flex items-center">
            {!isRootTab ? (
              <button
                type="button"
                onClick={handleBack}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-ink hover:bg-surface active:bg-accent-subtle transition-colors"
                aria-label="Kembali ke Dashboard"
              >
                <ArrowLeft className="w-5 h-5 text-ink" />
              </button>
            ) : (
              <div className="min-w-[44px] min-h-[44px] flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="KIM3"
                  className="h-7 w-auto object-contain"
                />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 px-2 text-left">
            <h1 className="text-sm font-bold text-ink truncate leading-tight">
              {currentInfo.title}
            </h1>
            <p className="text-[10px] text-ink-subtle truncate font-medium">
              {currentInfo.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-surface active:bg-accent-subtle transition-colors cursor-pointer"
              aria-label="Ganti tema tampilan"
              title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-ink" />
              )}
            </button>

            <NotificationDropdown />

            <button
              type="button"
              onClick={() => setMobileProfileOpen(true)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md hover:bg-surface active:bg-accent-subtle transition-colors"
              aria-label="Buka profil pengguna"
            >
              <div className="w-8 h-8 rounded-md bg-accent text-white font-bold flex items-center justify-center text-xs shadow-2xs overflow-hidden">
                {authUser?.foto_profil ? (
                  <img src={authUser.foto_profil} alt="Foto profil" className="w-full h-full object-cover" />
                ) : (
                  currentUser?.charAt(0) || 'U'
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Desktop Header (>= 768px) */}
        <div className="hidden md:flex max-w-[1600px] mx-auto px-4 lg:px-6 h-[60px] items-center justify-between gap-4">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="KIM3 Bengkel"
              className="h-9 w-auto object-contain"
            />
            <div className="border-l border-[#E2E8F0] dark:border-border pl-3">
              <span className="block text-xs font-bold text-[#0F172A] dark:text-white leading-tight">KIM 3 WEB FLEET</span>
              <span className="block text-[10px] text-[#64748B] dark:text-slate-400">Customer Monitoring Portal</span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2.5">
            {/* Desktop Theme Switcher */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-center w-9 h-9 rounded-lg border border-[#E2E8F0] dark:border-border bg-white dark:bg-surface hover:bg-[#EEF2FF] dark:hover:bg-white/10 text-[#475569] dark:text-slate-300 hover:text-[#12388F] dark:hover:text-white transition-all cursor-pointer group"
              aria-label="Ganti tema tampilan"
              title={theme === 'dark' ? 'Ganti ke Mode Terang (Light Mode)' : 'Ganti ke Mode Industri Gelap (Dark Mode)'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-4 h-4 text-inherit group-hover:-rotate-12 transition-transform" />
              )}
            </button>

            {/* Notification Center */}
            <NotificationDropdown />

            {/* User Profile Pill & Logout */}
            <div className="flex items-center gap-3 pl-3 border-l border-border">
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="flex items-center gap-2.5 rounded-md px-1.5 py-1 -mx-1.5 hover:bg-surface transition-colors cursor-pointer group"
                title="Buka profil saya"
                aria-label="Buka profil saya"
              >
                <span className="w-8 h-8 rounded-md bg-accent text-white font-bold flex items-center justify-center text-xs shadow-2xs overflow-hidden group-hover:ring-2 group-hover:ring-accent/40 transition shrink-0">
                  {authUser?.foto_profil ? (
                    <img src={authUser.foto_profil} alt="Foto profil" className="w-full h-full object-cover" />
                  ) : (
                    currentUser?.charAt(0) || 'U'
                  )}
                </span>
                <span className="text-left">
                  <span className="block text-xs font-bold text-ink leading-tight group-hover:text-accent transition-colors">
                    {authUser?.nama_perusahaan || currentUser || 'Mitra Customer'}
                  </span>
                  <span className="block text-[10px] text-ink-subtle font-medium">
                    {authUser?.email || currentUser}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={logout}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-md text-ink-subtle hover:text-status-red hover:bg-status-red-bg/70 active:bg-status-red-bg transition-colors ml-1 cursor-pointer"
                title="Keluar dari Akun (Logout)"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Floating Notification Toasts */}
        <FloatingNotificationToast />
      </header>

      {/* Mobile User Profile Sheet */}
      {mobileProfileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-surface-dark/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileProfileOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full bg-surface-raised rounded-t-xl shadow-2xl border-t border-border max-h-[85vh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] font-sans animate-in slide-in-from-bottom duration-200">
            <div className="pt-2.5 pb-1 flex justify-center">
              <span className="w-10 h-1 rounded-full bg-border" />
            </div>

            <div className="px-4 pb-3 pt-1 flex items-center justify-between border-b border-border">
              <h3 className="text-sm font-bold text-ink">Akun Web Fleet</h3>
              <button
                type="button"
                onClick={() => setMobileProfileOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-ink-subtle hover:text-ink hover:bg-surface active:bg-accent-subtle transition-colors cursor-pointer"
                aria-label="Tutup profil"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-surface rounded-md border border-border">
                <div className="w-12 h-12 rounded-md bg-accent text-white font-bold flex items-center justify-center text-lg shadow-xs overflow-hidden shrink-0">
                  {authUser?.foto_profil ? (
                    <img src={authUser.foto_profil} alt="Foto profil" className="w-full h-full object-cover" />
                  ) : (
                    currentUser?.charAt(0) || 'U'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-ink truncate">
                    {currentUser || 'Customer Fleet'}
                  </div>
                  <div className="text-xs text-ink-muted truncate flex items-center gap-1 mt-0.5">
                    <Mail className="w-3.5 h-3.5 text-ink-subtle" />
                    <span>{authUser?.email || '-'}</span>
                  </div>
                  {authUser?.nama_perusahaan && (
                    <div className="text-xs text-accent font-medium truncate flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{authUser.nama_perusahaan}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-md bg-surface border border-border text-[11px] text-ink-muted space-y-1">
                <div className="font-semibold text-ink flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-status-green" />
                  <span>Sesi Web Fleet Aktif</span>
                </div>
                <p>Status pelacakan kendaraan dan persetujuan estimasi realtime.</p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-md bg-surface border border-border">
                <div className="flex items-center gap-2">
                  {theme === 'dark' ? (
                    <Moon className="w-4 h-4 text-accent" />
                  ) : (
                    <Sun className="w-4 h-4 text-amber-500" />
                  )}
                  <span className="text-xs font-semibold text-ink">Tema Tampilan</span>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-raised border border-border text-xs font-bold text-ink shadow-2xs active:bg-accent-subtle cursor-pointer"
                >
                  {theme === 'dark' ? 'Gelap (Dark)' : 'Terang (Light)'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMobileProfileOpen(false);
                  setProfileOpen(true);
                }}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-accent-subtle text-accent border border-accent/25 font-bold text-xs hover:bg-accent hover:text-white transition-colors cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>Edit Profil Perusahaan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileProfileOpen(false);
                  logout();
                }}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-status-red-bg text-status-red border border-status-red/25 font-bold text-xs hover:bg-status-red-bg/80 active:bg-status-red-bg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar dari Akun (Logout)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Profil Saya */}
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </>
  );
};

export default Navbar;
