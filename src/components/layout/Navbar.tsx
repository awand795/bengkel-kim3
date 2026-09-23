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
  CheckCircle2 
} from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
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
  'dashboard': { title: 'Monitoring Operasional', subtitle: 'Dashboard' },
  'security-dashboard': { title: 'Dashboard Pos Gerbang', subtitle: 'Security' },
  'security-checkin': { title: 'Check In Kendaraan', subtitle: 'Pos Security' },
  'security-booking': { title: 'List Nopol Booking', subtitle: 'Pos Security' },
  'security-onprogress': { title: 'Nopol di Bengkel', subtitle: 'Unit On Progress' },
  'security-selesai': { title: 'Meninggalkan Bengkel', subtitle: 'Unit Keluar' },
  'security-memo': { title: 'Memo Keluar Resmi', subtitle: 'Pos Security' },
  'security': { title: 'Pos Gerbang Security', subtitle: 'Security' },
  'sa': { title: 'Service Advisor (SPK)', subtitle: 'Estimasi & SPK' },
  'foreman': { title: 'Foreman (QC & Penugasan)', subtitle: 'Workshop Control' },
  'mekanik': { title: 'Pekerjaan Saya', subtitle: 'Mekanik Stopwatch' },
  'purchasing': { title: 'Purchasing & Part', subtitle: 'PR, PO & Kotak Merah' },
  'beli-part': { title: 'Penjualan Part Langsung', subtitle: 'Direct Sale' },
  'kasir': { title: 'Kasir & Faktur Tagihan', subtitle: 'Invoice & Pembayaran' },
  'fleet-dashboard': { title: 'Portal Armada Fleet', subtitle: 'Customer Fleet' },
  'fleet-booking': { title: 'Booking Service Baru', subtitle: 'Customer Fleet' },
  'fleet-status': { title: 'Status & Pelacakan Unit', subtitle: 'Live Tracking' },
  'fleet-history': { title: 'Histori Servis & Invoice', subtitle: 'Riwayat Servis' },
  'fleet-kendaraan': { title: 'Daftar Armada Truk', subtitle: 'Data Armada' },
  'fleet-dokumen': { title: 'Dokumen STNK & KIR', subtitle: 'Arsip Dokumen' },
  'fleet-profil': { title: 'Profil Customer & Kontak', subtitle: 'Data Pelanggan' },
  'pic-terkait': { title: 'Konfirmasi Tamu (PIC)', subtitle: 'Persetujuan Tamu' },
};

export const Navbar: React.FC = () => {
  const { currentRole, currentUser, authUser, activeTab, setActiveTab, logout } = useAppStore();
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);

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
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#D8DCDF] font-sans safe-top">
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
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-[6px] text-[#1B2126] hover:bg-[#F2F4F5] active:bg-[#E6F3F5] transition-colors"
                aria-label="Kembali ke halaman utama role"
              >
                <ArrowLeft className="w-5 h-5 text-[#1B2126]" />
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
            <h1 className="text-sm font-bold text-[#1B2126] truncate leading-tight">
              {currentInfo.title}
            </h1>
            <p className="text-[10px] text-[#79838C] truncate font-medium">
              {currentInfo.subtitle || currentRole}
            </p>
          </div>

          {/* Right: Notifications & User Avatar Button */}
          <div className="flex items-center gap-1">
            <NotificationDropdown />

            <button
              type="button"
              onClick={() => setMobileProfileOpen(true)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-[6px] hover:bg-[#F2F4F5] active:bg-[#E6F3F5] transition-colors"
              aria-label="Buka profil pengguna"
            >
              <div className="w-8 h-8 rounded-[6px] bg-[#0F6674] text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                {currentUser?.charAt(0) || 'U'}
              </div>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. DESKTOP APP HEADER (>= 768px)                         */}
        {/* ======================================================== */}
        <div className="hidden md:flex max-w-[1600px] mx-auto px-4 lg:px-6 h-16 items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="KIM3 Bengkel"
              className="h-9 w-auto object-contain"
            />
          </div>

          {/* Right Controls: Role Badge, Notifications, User Details, Logout */}
          <div className="flex items-center gap-3">
            {/* Locked Role Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-[#B2D8DC] bg-[#E6F3F5] text-[#0F6674] text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{currentRole}</span>
            </div>

            {/* Notification Center */}
            <NotificationDropdown />

            {/* User Profile Pill & Logout */}
            <div className="flex items-center gap-3 pl-3 border-l border-[#D8DCDF]">
              <div className="w-8 h-8 rounded-[6px] bg-[#0F6674] text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                {currentUser?.charAt(0) || 'U'}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-[#1B2126] leading-tight">
                  {currentUser || 'Pengguna'}
                </div>
                <div className="text-[10px] text-[#79838C] font-medium">
                  {authUser?.nama_perusahaan || currentRole}
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-[6px] text-[#79838C] hover:text-[#DC2626] hover:bg-[#FEE2E2]/70 active:bg-[#FEE2E2] transition-colors ml-1"
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
            className="absolute inset-0 bg-[#08282E]/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileProfileOpen(false)}
            aria-hidden="true"
          />

          {/* Sheet Body */}
          <div className="relative w-full bg-white rounded-t-[12px] shadow-2xl border-t border-[#D8DCDF] max-h-[85vh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] font-sans animate-in slide-in-from-bottom duration-200">
            {/* Grab Handle */}
            <div className="pt-2.5 pb-1 flex justify-center">
              <span className="w-10 h-1 rounded-full bg-[#D8DCDF]" />
            </div>

            {/* Sheet Header */}
            <div className="px-4 pb-3 pt-1 flex items-center justify-between border-b border-[#D8DCDF]">
              <h3 className="text-sm font-bold text-[#1B2126]">Akun Pengguna</h3>
              <button
                type="button"
                onClick={() => setMobileProfileOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-[6px] text-[#79838C] hover:text-[#1B2126] hover:bg-[#F2F4F5] active:bg-[#E6F3F5] transition-colors"
                aria-label="Tutup profil"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sheet Content */}
            <div className="p-4 space-y-4">
              {/* User Identity Card */}
              <div className="flex items-center gap-3 p-3 bg-[#F2F4F5] rounded-[6px] border border-[#D8DCDF]">
                <div className="w-12 h-12 rounded-[6px] bg-[#0F6674] text-white font-bold flex items-center justify-center text-lg shadow-xs">
                  {currentUser?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-[#1B2126] truncate">
                    {currentUser || 'Pengguna'}
                  </div>
                  <div className="text-xs text-[#525C65] truncate flex items-center gap-1 mt-0.5">
                    <Mail className="w-3.5 h-3.5 text-[#79838C]" />
                    <span>{authUser?.email || '-'}</span>
                  </div>
                  {authUser?.nama_perusahaan && (
                    <div className="text-xs text-[#0F6674] font-medium truncate flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{authUser.nama_perusahaan}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Role Chip */}
              <div className="flex items-center justify-between p-3 rounded-[6px] border border-[#B2D8DC] bg-[#E6F3F5]">
                <span className="text-xs font-semibold text-[#0F6674]">Peran / Otoritas Akses</span>
                <span className="px-2.5 py-0.5 rounded-[4px] bg-[#0F6674] text-white text-xs font-bold">
                  {currentRole}
                </span>
              </div>

              {/* System Note */}
              <div className="p-3 rounded-[6px] bg-[#F2F4F5] border border-[#D8DCDF] text-[11px] text-[#525C65] space-y-1">
                <div className="font-semibold text-[#1B2126] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  <span>Sesi Bengkel KIM 3 Aktif</span>
                </div>
                <p>Navigasi dioptimalkan untuk mobile app-shell. Mode offline aktif dengan cache lokal.</p>
              </div>

              {/* Logout Button (min 44px touch target) */}
              <button
                type="button"
                onClick={() => {
                  setMobileProfileOpen(false);
                  logout();
                }}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-[6px] bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] font-bold text-xs hover:bg-[#FEE2E2]/80 active:bg-[#FECACA] transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar dari Akun (Logout)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
