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
  const { activeTab, setActiveTab, currentRole } = useAppStore();
  const [moreOpen, setMoreOpen] = useState(false);

  // Exact menu alignment with desktop sidebar per role (Stage 9)
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

      // 2. Service Advisor (4 menu: pas 4 di bar, tanpa "Lainnya")
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

      // 3. Foreman (3 menu: pas 3 di bar, tanpa "Lainnya")
      case 'Foreman':
        return {
          primary: [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'foreman', label: 'QC & Tugas', icon: Wrench },
            { id: 'mekanik', label: 'Live Mekanik', icon: Clock },
          ],
          more: [],
        };

      // 4. Mekanik (2 menu: pas 2 di bar, tanpa "Lainnya")
      case 'Mekanik':
        return {
          primary: [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'mekanik', label: 'Pekerjaan Saya', icon: Clock },
          ],
          more: [],
        };

      // 5. Kasir / Admin Invoice (3 menu: pas 3 di bar, tanpa "Lainnya")
      case 'Admin Invoice':
        return {
          primary: [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'kasir', label: 'Kasir & Inv', icon: Receipt },
            { id: 'beli-part', label: 'Beli Part', icon: Package },
          ],
          more: [],
        };

      // 6. Admin Purchasing (2 menu: pas 2 di bar, tanpa "Lainnya")
      case 'Admin Purchasing':
        return {
          primary: [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'purchasing', label: 'PR & PO Part', icon: ShoppingBag },
          ],
          more: [],
        };

      // 7. PIC Terkait (2 menu: pas 2 di bar, tanpa "Lainnya")
      case 'PIC Terkait':
        return {
          primary: [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'pic-terkait', label: 'Kunjungan Tamu', icon: UserCheck },
          ],
          more: [],
        };

      // 8. Web Fleet / Customer Fleet (7 menu: 4 di bar, 3 di "Lainnya")
      case 'Customer Fleet':
        return {
          primary: [
            { id: 'fleet-dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'fleet-booking', label: 'Booking', icon: Calendar },
            { id: 'fleet-status', label: 'Status Unit', icon: Truck },
            { id: 'fleet-history', label: 'Histori & Inv', icon: Receipt },
          ],
          more: [
            { id: 'fleet-kendaraan', label: 'Daftar Armada Truk', icon: Car },
            { id: 'fleet-dokumen', label: 'Dokumen STNK & KIR', icon: FileText },
            { id: 'fleet-profil', label: 'Profil Customer & Kontak', icon: Building2 },
          ],
        };

      // Super Admin (8 menu: 4 di bar, 4 di "Lainnya")
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
            { id: 'purchasing', label: 'Purchasing & Part', icon: ShoppingBag },
            { id: 'kasir', label: 'Kasir & Faktur', icon: Receipt },
            { id: 'fleet-dashboard', label: 'Portal Armada Fleet', icon: Truck },
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
    setMoreOpen(false);
  };

  return (
    <>
      {/* Mobile Fixed Bottom Navigation Bar (< 768px) */}
      <nav
        aria-label="Navigasi Bawah Seluler"
        className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-[#D8DCDF] md:hidden z-40 px-1 py-1 safe-bottom flex items-center justify-around shadow-md font-sans"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleNavigate(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 min-h-[48px] min-w-[44px] py-1 transition-all rounded-[6px] active:scale-95 ${
                isActive ? 'text-[#0F6674]' : 'text-[#79838C] hover:text-[#1B2126]'
              }`}
            >
              <div
                className={`p-1.5 rounded-[6px] transition-colors ${
                  isActive ? 'bg-[#E6F3F5] text-[#0F6674]' : 'bg-transparent text-[#79838C]'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 truncate max-w-[70px] ${
                  isActive ? 'font-bold text-[#0F6674]' : 'font-medium text-[#79838C]'
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
            className={`flex flex-col items-center justify-center flex-1 min-h-[48px] min-w-[44px] py-1 transition-all rounded-[6px] active:scale-95 ${
              isMoreActive ? 'text-[#0F6674]' : 'text-[#79838C] hover:text-[#1B2126]'
            }`}
          >
            <div
              className={`p-1.5 rounded-[6px] transition-colors ${
                isMoreActive ? 'bg-[#E6F3F5] text-[#0F6674]' : 'bg-transparent text-[#79838C]'
              }`}
            >
              <MoreHorizontal className="w-5 h-5 shrink-0" />
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 truncate max-w-[70px] ${
                isMoreActive ? 'font-bold text-[#0F6674]' : 'font-medium text-[#79838C]'
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
            className="absolute inset-0 bg-[#08282E]/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />

          {/* Sheet Container */}
          <div className="relative w-full bg-white rounded-t-[12px] shadow-2xl border-t border-[#D8DCDF] max-h-[80vh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] font-sans animate-in slide-in-from-bottom duration-200">
            {/* Grab Handle */}
            <div className="pt-2.5 pb-1 flex justify-center">
              <span className="w-10 h-1 rounded-full bg-[#D8DCDF]" />
            </div>

            {/* Header */}
            <div className="px-4 pb-3 pt-1 flex items-center justify-between border-b border-[#D8DCDF]">
              <div>
                <h3 className="text-sm font-bold text-[#1B2126]">Menu Lainnya</h3>
                <p className="text-[11px] text-[#79838C]">Menu khusus {currentRole}</p>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-[6px] text-[#79838C] hover:text-[#1B2126] hover:bg-[#F2F4F5] active:bg-[#E6F3F5] transition-colors"
                aria-label="Tutup menu lainnya"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu List */}
            <div className="p-3 space-y-2">
              {moreTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleNavigate(tab.id)}
                    className={`w-full min-h-[48px] flex items-center gap-3 px-3.5 py-2.5 rounded-[6px] border text-left transition-all ${
                      isActive
                        ? 'bg-[#0F6674] text-white border-[#0F6674] font-semibold shadow-xs'
                        : 'bg-[#F2F4F5] text-[#1B2126] border-[#D8DCDF] hover:bg-[#E6F3F5] hover:text-[#0F6674] font-medium'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-[4px] flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-white text-[#0F6674] border border-[#D8DCDF]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs truncate">{tab.label}</span>
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
