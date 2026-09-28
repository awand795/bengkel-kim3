import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { 
  LogOut, 
  ShieldCheck, 
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
import { PeranUser } from '../../types';

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

const TAB_TITLES: Record<string, { title: string; subtitle?: string }> = {
  'admin-panel': { title: 'Admin Panel & Sistem', subtitle: 'Super Admin' },
  'admin-users': { title: 'Manajemen Pengguna & Role', subtitle: 'Super Admin' },
  'admin-ppn': { title: 'Pengaturan PPN', subtitle: 'Super Admin' },
  'admin-print': { title: 'Template Kop & Cetak', subtitle: 'Super Admin' },
  'admin-settings': { title: 'Profil Bengkel & Rekening', subtitle: 'Super Admin' },
  'dashboard': { title: 'Monitoring Operasional', subtitle: 'Dashboard' },
  'security-dashboard': { title: 'Dashboard Security', subtitle: 'Pos Security' },
  'security-checkin': { title: 'Check In Kendaraan', subtitle: 'Pos Security' },
  'security-booking': { title: 'List Nopol Booking', subtitle: 'Pos Security' },
  'security-onprogress': { title: 'Nopol di Bengkel', subtitle: 'Unit On Progress' },
  'security-selesai': { title: 'Meninggalkan Bengkel', subtitle: 'Unit Keluar' },
  'security-memo': { title: 'Memo Keluar Resmi', subtitle: 'Pos Security' },
  'sa': { title: 'Daftar SPK Aktif', subtitle: 'Service Advisor' },
  'sa-list': { title: 'Daftar SPK Aktif', subtitle: 'Service Advisor' },
  'sa-baru': { title: 'Buat SPK Baru', subtitle: 'Service Advisor' },
  'sa-penerimaan': { title: 'Buat SPK Baru', subtitle: 'Service Advisor' },
  'sa-kotak-merah': { title: 'Part Indent (PR Part)', subtitle: 'Service Advisor' },
  'sa-permintaan-part': { title: 'Permintaan Part', subtitle: 'Service Advisor' },
  'foreman': { title: 'Foreman (QC & Penugasan)', subtitle: 'Workshop Control' },
  'foreman-tugas': { title: 'Tugas Mekanik & SPK', subtitle: 'Foreman' },
  'foreman-cek': { title: 'Input Hasil Cek Mekanik', subtitle: 'Foreman' },
  'foreman-qc': { title: 'Quality Control (FIR)', subtitle: 'Foreman' },
  'mekanik': { title: 'Pekerjaan Saya', subtitle: 'Mekanik Stopwatch' },
  'purchasing': { title: 'Purchasing & Part', subtitle: 'PR, PO & Part Indent' },
  'beli-part': { title: 'Penjualan Part Langsung', subtitle: 'Direct Sale' },
  'beli-part-transaksi': { title: 'Daftar Transaksi Part', subtitle: 'Direct Sale' },
  'beli-part-estimasi': { title: 'Estimasi & POS Baru', subtitle: 'Direct Sale' },
  'beli-part-picking': { title: 'Warehouse Picking', subtitle: 'Direct Sale' },
  'kasir': { title: 'Kasir & Faktur Tagihan', subtitle: 'Invoice & Pembayaran' },
  'fleet-dashboard': { title: 'Portal Kendaraan Fleet', subtitle: 'Customer Fleet' },
  'fleet-booking': { title: 'Booking Service Baru', subtitle: 'Customer Fleet' },
  'fleet-status': { title: 'Status & Pelacakan Unit', subtitle: 'Live Tracking' },
  'fleet-history': { title: 'Histori Servis & Invoice', subtitle: 'Riwayat Servis' },
  'fleet-kendaraan': { title: 'Kendaraan Saya', subtitle: 'Data Kendaraan' },
  'fleet-dokumen': { title: 'Dokumen Saya', subtitle: 'Berkas & Faktur' },
  'fleet-profil': { title: 'Profil Customer & Kontak', subtitle: 'Data Pelanggan' },
  'pic-terkait': { title: 'Konfirmasi Tamu (PIC)', subtitle: 'Persetujuan Tamu' },
};

export const Navbar: React.FC = () => {
  const { currentRole, currentUser, authUser, activeTab, setActiveTab, logout, theme, toggleTheme } = useAppStore();
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const defaultTab = roleDefaultTabs[currentRole] || 'dashboard';
  const isRootTab = activeTab === defaultTab;

  const currentInfo = TAB_TITLES[activeTab] || {
    title: activeTab.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    subtitle: currentRole,
  };

  const handleBack = () => {
    setActiveTab(defaultTab);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 font-sans safe-top shadow-sm">
        {/* ======================================================== */}
        {/* 1. MOBILE NATIVE TOP APP BAR (< 768px)                   */}
        {/* ======================================================== */}
        <div className="flex md:hidden items-center justify-between px-3 h-14">
          {/* Left: Back button (if non-root) or Workshop brand mark */}
          <div className="flex items-center">
            {!isRootTab ? (
              <button
                type="button"
                onClick={handleBack}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-ink hover:bg-surface active:bg-accent-subtle transition-colors"
                aria-label="Kembali ke halaman utama role"
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

          {/* Center: Slim Title & Subtitle */}
          <div className="flex-1 min-w-0 px-2 text-left">
            <h1 className="text-sm font-bold text-ink truncate leading-tight">
              {currentInfo.title}
            </h1>
            <p className="text-[10px] text-ink-subtle truncate font-medium">
              {currentInfo.subtitle || currentRole}
            </p>
          </div>

          {/* Right: Theme Toggle, Notifications & User Avatar Button */}
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

        {/* ======================================================== */}
        {/* 2. DESKTOP APP HEADER (>= 768px)                         */}
        {/* ======================================================== */}
        <div className="hidden md:flex max-w-[1600px] mx-auto px-4 lg:px-6 h-[60px] items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="KIM3 Bengkel"
              className="h-9 w-auto object-contain"
            />
          </div>

          {/* Right Controls: Role Badge, Theme Switcher, Notifications, User Details, Logout */}
          <div className="flex items-center gap-2.5">
            {/* Locked Role Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{currentRole}</span>
            </div>

            {/* Desktop Theme Switcher */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-all cursor-pointer hover:border-blue-300 group"
              aria-label="Ganti tema tampilan"
              title={theme === 'dark' ? 'Ganti ke Mode Terang (Light Mode)' : 'Ganti ke Mode Industri Gelap (Dark Mode)'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700 dark:text-ink-muted group-hover:-rotate-12 transition-transform" />
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
                    {currentUser || 'Pengguna'}
                  </span>
                  <span className="block text-[10px] text-ink-subtle font-medium">
                    {authUser?.nama_perusahaan || currentRole}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={logout}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-md text-ink-subtle hover:text-status-red hover:bg-status-red-bg/70 active:bg-status-red-bg transition-colors ml-1"
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

      {/* ======================================================== */}
      {/* 3. MOBILE USER PROFILE BOTTOM SHEET (< 768px)            */}
      {/* ======================================================== */}
      {mobileProfileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-surface-dark/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileProfileOpen(false)}
            aria-hidden="true"
          />

          {/* Sheet Body */}
          <div className="relative w-full bg-surface-raised rounded-t-xl shadow-2xl border-t border-border max-h-[85vh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] font-sans animate-in slide-in-from-bottom duration-200">
            {/* Grab Handle */}
            <div className="pt-2.5 pb-1 flex justify-center">
              <span className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Sheet Header */}
            <div className="px-4 pb-3 pt-1 flex items-center justify-between border-b border-border">
              <h3 className="text-sm font-bold text-ink">Akun Pengguna</h3>
              <button
                type="button"
                onClick={() => setMobileProfileOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-ink-subtle hover:text-ink hover:bg-surface active:bg-accent-subtle transition-colors"
                aria-label="Tutup profil"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sheet Content */}
            <div className="p-4 space-y-4">
              {/* User Identity Card */}
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
                    {currentUser || 'Pengguna'}
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

              {/* Role Chip */}
              <div className="flex items-center justify-between p-3 rounded-md border border-accent/30 bg-accent-subtle">
                <span className="text-xs font-semibold text-accent">Peran / Otoritas Akses</span>
                <span className="px-2.5 py-0.5 rounded bg-accent text-white text-xs font-bold">
                  {currentRole}
                </span>
              </div>

              {/* System Note */}
              <div className="p-3 rounded-md bg-surface border border-border text-[11px] text-ink-muted space-y-1">
                <div className="font-semibold text-ink flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-status-green" />
                  <span>Sesi Bengkel KIM 3 Aktif</span>
                </div>
                <p>Navigasi dioptimalkan untuk mobile app-shell. Mode offline aktif dengan cache lokal.</p>
              </div>

              {/* Theme Switcher Row */}
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-raised border border-border text-xs font-bold text-ink shadow-2xs active:bg-accent-subtle"
                >
                  {theme === 'dark' ? 'Gelap (Dark)' : 'Terang (Light)'}
                </button>
              </div>

              {/* Edit Profil Button */}
              <button
                type="button"
                onClick={() => {
                  setMobileProfileOpen(false);
                  setProfileOpen(true);
                }}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-accent-subtle text-accent border border-accent/25 font-bold text-xs hover:bg-accent hover:text-white transition-colors"
              >
                <User className="w-4 h-4" />
                <span>Edit Profil Saya</span>
              </button>

              {/* Logout Button (min 44px touch target) */}
              <button
                type="button"
                onClick={() => {
                  setMobileProfileOpen(false);
                  logout();
                }}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-status-red-bg text-status-red border border-status-red/25 font-bold text-xs hover:bg-status-red-bg/80 active:bg-status-red-bg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar dari Akun (Logout)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Profil Saya (desktop & mobile) */}
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </>
  );
};

export default Navbar;
