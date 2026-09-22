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
  X
} from 'lucide-react';

interface NavTab {
  id: string;
  label: string;
  icon: any;
}

export const MobileBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, currentRole } = useAppStore();
  const [moreOpen, setMoreOpen] = useState(false);

  const getRoleTabs = (): NavTab[] => {
    switch (currentRole) {
      case 'Security':
        return [
          { id: 'security-dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'security-checkin', label: 'Check In', icon: PlusCircle },
          { id: 'security-booking', label: 'Booking', icon: Calendar },
          { id: 'security-onprogress', label: 'On Progress', icon: Clock },
          { id: 'security-memo', label: 'Memo Keluar', icon: FileText },
        ];
      case 'Mekanik':
        return [
          { id: 'mekanik', label: 'Pekerjaan Saya', icon: Clock },
        ];
      case 'PIC Terkait':
        return [
          { id: 'pic-terkait', label: 'Kunjungan', icon: UserCheck },
        ];
      case 'Foreman':
        return [
          { id: 'foreman', label: 'QC & Penugasan', icon: Wrench },
          { id: 'mekanik', label: 'Mekanik Live', icon: Clock },
          { id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
        ];
      case 'Admin Purchasing':
        return [
          { id: 'purchasing', label: 'PR & PO', icon: ShoppingBag },
          { id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
        ];
      case 'Admin Invoice':
        return [
          { id: 'kasir', label: 'Kasir & Inv', icon: Receipt },
          { id: 'beli-part', label: 'Beli Part', icon: Package },
          { id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
        ];
      case 'SA':
        return [
          { id: 'sa', label: 'Estimasi & SPK', icon: ClipboardList },
          { id: 'purchasing', label: 'Kotak Merah', icon: ShoppingBag },
          { id: 'beli-part', label: 'Beli Part', icon: Package },
          { id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
        ];
      case 'Customer Fleet':
      default:
        // Hanya 4 menu paling sering dipakai di bottom bar,
        // sisanya (Kendaraan / Dokumen / Profil) masuk menu "More".
        return [
          { id: 'fleet-dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'fleet-status', label: 'Status', icon: Truck },
          { id: 'fleet-booking', label: 'Booking', icon: Calendar },
          { id: 'fleet-history', label: 'History', icon: Receipt },
        ];
    }
  };

  const getMoreTabs = (): NavTab[] => {
    switch (currentRole) {
      case 'Security':
        return [
          { id: 'security-selesai', label: 'Selesai / Keluar', icon: LogOut },
        ];
      case 'SA':
        return [
          { id: 'dokumen', label: 'Dokumen STNK & KIR', icon: FileText },
        ];
      case 'Customer Fleet':
        return [
          { id: 'fleet-kendaraan', label: 'Daftar Armada Truk', icon: Car },
          { id: 'fleet-dokumen', label: 'Dokumen STNK & KIR', icon: FileText },
          { id: 'fleet-profil', label: 'Profil Customer & Kontak', icon: Building2 },
        ];
      default:
        return [];
    }
  };

  const tabs = getRoleTabs();
  const moreTabs = getMoreTabs();
  const isMoreActive = moreTabs.some((tab) => tab.id === activeTab);

  // If role only has 1 tab (like Mekanik on phone), no need for cluttered bottom bar
  if (tabs.length <= 1 && moreTabs.length === 0) {
    return null;
  }

  const handleNavigate = (id: string) => {
    setActiveTab(id);
    setMoreOpen(false);
  };

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 lg:hidden z-40 py-1.5 px-3 safe-bottom flex items-center justify-around shadow-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 min-h-[52px] py-1 transition-all ${
                isActive ? 'text-blue-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className={`p-1.5 rounded-xl ${isActive ? 'bg-blue-50' : 'bg-transparent'}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">{tab.label}</span>
            </button>
          );
        })}

        {moreTabs.length > 0 && (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center justify-center flex-1 min-h-[52px] py-1 transition-all ${
              isMoreActive ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1.5 rounded-xl ${isMoreActive ? 'bg-blue-50' : 'bg-transparent'}`}>
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">More</span>
          </button>
        )}
      </nav>

      {/* More Menu Bottom Sheet */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setMoreOpen(false)}
          />
          <div className="relative w-full bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 max-h-[75vh] overflow-y-auto">
            <div className="pt-3 pb-1 flex justify-center">
              <span className="w-10 h-1.5 rounded-full bg-slate-300" />
            </div>

            <div className="px-5 pb-2 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Menu Lainnya</h3>
                <p className="text-[11px] text-slate-500">Menu {currentRole}</p>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Tutup menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-3 pb-6 pt-1 space-y-2">
              {moreTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleNavigate(tab.id)}
                    className={`w-full min-h-[56px] flex items-center gap-3.5 px-4 py-3 rounded-2xl text-left transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-500 border border-slate-200'
                      }`}
                    >                        <Icon className="w-4 h-4" />
                    </div>
                    <span className={`text-sm ${isActive ? 'font-bold' : 'font-semibold'}`}>{tab.label}</span>
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
