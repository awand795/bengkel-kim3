import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { 
  LogOut, 
  ShieldCheck, 
  ArrowLeft, 
  X, 
  Building2, 
  Mail, 
  CheckCircle2,
  Sparkles
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
  'sa-penerimaan': { title: 'Penerimaan & Buat SPK', subtitle: 'Service Advisor' },
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
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80 font-sans safe-top shadow-xs">
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
                className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
                aria-label="Kembali ke halaman utama role"
              >
                <ArrowLeft className="w-5 h-5 text-slate-800" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
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
            <h1 className="text-sm font-bold text-slate-900 truncate leading-tight">
              {currentInfo.title}
            </h1>
            <p className="text-[10px] text-slate-500 truncate font-medium">
              {currentInfo.subtitle || currentRole}
            </p>
          </div>

          {/* Right: Notifications & User Avatar Button */}
          <div className="flex items-center gap-1.5">
            <NotificationDropdown />

            <button
              type="button"
              onClick={() => setMobileProfileOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:ring-2 hover:ring-teal-500/20 transition-all"
              aria-label="Buka profil pengguna"
            >
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-teal-600 to-teal-800 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                {currentUser?.charAt(0) || 'U'}
              </div>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. DESKTOP APP HEADER (>= 768px)                         */}
        {/* ======================================================== */}
        <div className="hidden md:flex max-w-[1600px] mx-auto px-6 h-16 items-center justify-between gap-4">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="KIM3 Bengkel"
              className="h-9 w-auto object-contain"
            />
            <div className="hidden lg:block border-l border-slate-200 pl-3">
              <span className="text-xs font-semibold text-slate-700 block leading-tight">Workshop Management System</span>
              <span className="text-[10px] text-slate-400 font-medium">Bengkel KIM 3 • Operasional &amp; Fleet</span>
            </div>
          </div>

          {/* Right Controls: Role Badge, Notifications, User Details, Logout */}
          <div className="flex items-center gap-3">
            {/* Modern Role Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-teal-200/80 bg-teal-50 text-teal-800 text-xs font-semibold shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>{currentRole}</span>
            </div>

            {/* Notification Center */}
            <NotificationDropdown />

            {/* User Profile Pill & Logout */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-teal-600 to-teal-800 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                {currentUser?.charAt(0) || 'U'}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-800 leading-tight">
                  {currentUser || 'Pengguna'}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {authUser?.nama_perusahaan || currentRole}
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition-colors ml-1"
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
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileProfileOpen(false)}
            aria-hidden="true"
          />

          {/* Sheet Body */}
          <div className="relative w-full bg-white rounded-t-2xl shadow-2xl border-t border-slate-200 max-h-[85vh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] font-sans animate-in slide-in-from-bottom duration-200">
            {/* Grab Handle */}
            <div className="pt-3 pb-1 flex justify-center">
              <span className="w-12 h-1.5 rounded-full bg-slate-300" />
            </div>

            {/* Sheet Header */}
            <div className="px-5 pb-3 pt-2 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">Akun Pengguna</h3>
              </div>
              <button
                type="button"
                onClick={() => setMobileProfileOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
                aria-label="Tutup profil"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sheet Content */}
            <div className="p-5 space-y-4">
              {/* User Identity Card */}
              <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-teal-600 to-teal-800 text-white font-bold flex items-center justify-center text-lg shadow-sm">
                  {currentUser?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {currentUser || 'Pengguna'}
                  </div>
                  <div className="text-xs text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{authUser?.email || '-'}</span>
                  </div>
                  {authUser?.nama_perusahaan && (
                    <div className="text-xs text-teal-700 font-medium truncate flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-teal-600" />
                      <span>{authUser.nama_perusahaan}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Role Chip */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-teal-100 bg-teal-50/70">
                <span className="text-xs font-semibold text-teal-900">Peran / Otoritas Akses</span>
                <span className="px-3 py-1 rounded-full bg-teal-600 text-white text-xs font-bold shadow-2xs">
                  {currentRole}
                </span>
              </div>

              {/* System Note */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Sesi Bengkel KIM 3 Aktif</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Navigasi dioptimalkan untuk mobile app-shell. Sinkronisasi data real-time aktif.
                </p>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={() => {
                  setMobileProfileOpen(false);
                  logout();
                }}
                className="w-full min-h-[46px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs hover:bg-rose-100 active:bg-rose-200 transition-colors shadow-2xs"
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
