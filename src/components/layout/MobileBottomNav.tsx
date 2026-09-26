import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  LayoutDashboard,
  ShieldCheck,
  ClipboardList,
  Wrench,
  ShoppingBag,
  Truck,
  Clock,
  Package,
  Receipt,
  FileText,
  Car,
  Calendar,
  Building2,
  PlusCircle,
  LogOut,
  UserCheck,
  MoreHorizontal,
  Settings,
  X
} from 'lucide-react';
import { PeranUser } from '../../types';

interface NavTab {
  id: string;
  label: string;
  icon: any;
}

interface RoleNavConfig {
  primary: NavTab[];
  more: NavTab[];
}

export const MobileBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, bumpNav, currentRole } = useAppStore();
  const [moreOpen, setMoreOpen] = useState(false);

  const getRoleConfig = (role: PeranUser): RoleNavConfig => {
    switch (role) {
      // 1. Security (6 menu: 4 di bar, 2 di "Lainnya")
      case 'Security':
        return {
          primary: [
            { id: 'security-dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'security-checkin', label: 'Check In', icon: PlusCircle },
            { id: 'security-booking', label: 'Booking', icon: Calendar },
            { id: 'security-onprogress', label: 'On Progress', icon: Clock },
          ],
          more: [
            { id: 'security-selesai', label: 'Telah Keluar', icon: LogOut },
            { id: 'security-memo', label: 'Memo Keluar', icon: FileText },
          ],
        };

      // 2. Service Advisor (4 menu)
      case 'SA':
        return {
          primary: [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'sa', label: 'SPK & Est.', icon: ClipboardList },
            { id: 'purchasing', label: 'Kotak Merah', icon: ShoppingBag },
            { id: 'beli-part', label: 'Beli Part', icon: Package },
          ],
          more: [],
        };

      // 3. Foreman (3 menu)
      case 'Foreman':
        return {
          primary: [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'foreman', label: 'QC & Tugas', icon: Wrench },
            { id: 'mekanik', label: 'Live Mekanik', icon: Clock },
          ],
          more: [],
        };

      // 4. Mekanik (2 menu)
      case 'Mekanik':
        return {
          primary: [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'mekanik', label: 'Pekerjaan Saya', icon: Clock },
          ],
          more: [],
        };

      // 5. Kasir / Admin Invoice (3 menu)
      case 'Admin Invoice':
        return {
          primary: [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'kasir', label: 'Kasir & Inv', icon: Receipt },
            { id: 'beli-part', label: 'Beli Part', icon: Package },
          ],
          more: [],
        };

      // 6. Admin Purchasing (2 menu)
      case 'Admin Purchasing':
        return {
          primary: [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'purchasing', label: 'PR & PO Part', icon: ShoppingBag },
          ],
          more: [],
        };

      // 7. PIC Terkait (2 menu)
      case 'PIC Terkait':
        return {
          primary: [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'pic-terkait', label: 'Kunjungan Tamu', icon: UserCheck },
          ],
          more: [],
        };

      // 8. Web Fleet / Customer Fleet (7 menu)
      case 'Customer Fleet':
        return {
          primary: [
            { id: 'fleet-dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'fleet-booking', label: 'Booking', icon: Calendar },
            { id: 'fleet-status', label: 'Status Unit', icon: Truck },
            { id: 'fleet-history', label: 'Histori & Inv', icon: Receipt },
          ],
          more: [
            { id: 'fleet-kendaraan', label: 'Daftar Truk', icon: Car },
            { id: 'fleet-dokumen', label: 'Dokumen STNK', icon: FileText },
            { id: 'fleet-profil', label: 'Profil Saya', icon: Building2 },
          ],
        };

      // Super Admin
      case 'Super Admin':
        return {
          primary: [
            { id: 'admin-panel', label: 'Admin', icon: Settings },
            { id: 'dashboard', label: 'Monitoring', icon: LayoutDashboard },
            { id: 'security-dashboard', label: 'Security', icon: ShieldCheck },
            { id: 'sa', label: 'SA / SPK', icon: ClipboardList },
          ],
          more: [
            { id: 'foreman', label: 'Foreman QC', icon: Wrench },
            { id: 'purchasing', label: 'Purchasing', icon: ShoppingBag },
            { id: 'kasir', label: 'Kasir', icon: Receipt },
            { id: 'fleet-dashboard', label: 'Fleet Portal', icon: Truck },
          ],
        };

      // Warehouse
      case 'Warehouse':
        return {
          primary: [
            { id: 'beli-part', label: 'Penjualan Part', icon: Package },
          ],
          more: [],
        };

      default:
        return {
          primary: [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          ],
          more: [],
        };
    }
  };

  const { primary: tabs, more: moreTabs } = getRoleConfig(currentRole);
  const isMoreActive = moreTabs.some((tab) => tab.id === activeTab);

  if (tabs.length === 0) {
    return null;
  }

  const handleNavigate = (id: string) => {
    setActiveTab(id);
    bumpNav();
    setMoreOpen(false);
  };

  return (
    <>
      {/* Mobile Fixed Bottom Navigation Bar (< 768px) */}
      <nav
        aria-label="Navigasi Bawah Seluler"
        className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-lg border-t border-slate-200/80 md:hidden z-40 px-2 py-1 safe-bottom flex items-center justify-around shadow-lg font-sans"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleNavigate(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 min-h-[50px] min-w-[44px] py-1 transition-all rounded-xl active:scale-95 ${
                isActive ? 'text-teal-700' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg transition-colors ${
                  isActive ? 'bg-teal-50 text-teal-700 shadow-2xs' : 'bg-transparent text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 truncate max-w-[70px] ${
                  isActive ? 'font-bold text-teal-700' : 'font-medium text-slate-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* Slot 5: "Lainnya" Button if role has > 4 tabs */}
        {moreTabs.length > 0 && (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center justify-center flex-1 min-h-[50px] min-w-[44px] py-1 transition-all rounded-xl active:scale-95 ${
              isMoreActive ? 'text-teal-700' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <div
              className={`p-1.5 rounded-lg transition-colors ${
                isMoreActive ? 'bg-teal-50 text-teal-700 shadow-2xs' : 'bg-transparent text-slate-400'
              }`}
            >
              <MoreHorizontal className="w-5 h-5 shrink-0" />
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 truncate max-w-[70px] ${
                isMoreActive ? 'font-bold text-teal-700' : 'font-medium text-slate-500'
              }`}
            >
              Lainnya
            </span>
          </button>
        )}
      </nav>

      {/* "Lainnya" Menu Bottom Sheet Modal */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />

          {/* Sheet Container */}
          <div className="relative w-full bg-white rounded-t-2xl shadow-2xl border-t border-slate-200 max-h-[80vh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] font-sans animate-in slide-in-from-bottom duration-200">
            {/* Grab Handle */}
            <div className="pt-3 pb-1 flex justify-center">
              <span className="w-12 h-1.5 rounded-full bg-slate-300" />
            </div>

            {/* Header */}
            <div className="px-5 pb-3 pt-2 flex items-center justify-between border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Menu Lainnya</h3>
                <p className="text-[11px] text-slate-500">Akses modul tambahan {currentRole}</p>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
                aria-label="Tutup menu lainnya"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu List */}
            <div className="p-4 space-y-2">
              {moreTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleNavigate(tab.id)}
                    className={`w-full min-h-[48px] flex items-center gap-3.5 px-4 py-3 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'bg-teal-600 text-white border-teal-600 font-semibold shadow-xs'
                        : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 font-medium'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-white text-teal-600 border border-slate-200 shadow-2xs'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs truncate font-semibold">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileBottomNav;
