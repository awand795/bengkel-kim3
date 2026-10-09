import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  LayoutDashboard,
  Calendar,
  Receipt,
  Truck,
  FileText,
  Building2,
  HelpCircle,
  MoreHorizontal,
  X
} from 'lucide-react';

interface NavTab {
  id: string;
  label: string;
  icon: any;
}

export const MobileBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, bumpNav } = useAppStore();
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryTabs: NavTab[] = [
    { id: 'fleet-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'fleet-kendaraan', label: 'Kendaraan Saya', icon: Truck },
    { id: 'fleet-booking', label: 'Booking Service', icon: Calendar },
    { id: 'fleet-history', label: 'History Service', icon: Receipt },
  ];

  const moreTabs: NavTab[] = [
    { id: 'fleet-dokumen', label: 'Dokumen Saya', icon: FileText },
    { id: 'fleet-profil', label: 'Profil', icon: Building2 },
  ];

  const isMatchTab = (tabId: string, current: string) => {
    if (tabId === current) return true;
    if (tabId === 'fleet-dashboard' && current === 'dashboard') return true;
    return false;
  };

  const isMoreActive = moreTabs.some((tab) => isMatchTab(tab.id, activeTab));

  const handleNavigate = (id: string) => {
    if (id === 'fleet-bantuan') {
      window.open('https://wa.me/6281234567890?text=Halo%20Bengkel%20KIM3%2C%20saya%20butuh%20bantuan%20Web%20Fleet', '_blank');
      setMoreOpen(false);
      return;
    }
    setActiveTab(id);
    bumpNav();
    setMoreOpen(false);
  };

  return (
    <>
      {/* Mobile Fixed Bottom Navigation Bar (< 768px) */}
      <nav
        aria-label="Navigasi Bawah Seluler"
        className="fixed bottom-0 inset-x-0 bg-surface-raised/95 backdrop-blur-md border-t border-border md:hidden z-40 px-1 py-1 safe-bottom flex items-center justify-around shadow-md font-sans"
      >
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = isMatchTab(tab.id, activeTab);

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleNavigate(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 min-h-[48px] min-w-[44px] py-1 transition-all rounded-md active:scale-95 ${
                isActive ? 'text-accent' : 'text-ink-subtle hover:text-ink'
              }`}
            >
              <div
                className={`p-1.5 rounded-md transition-colors ${
                  isActive ? 'bg-accent-subtle text-accent' : 'bg-transparent text-ink-subtle'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 truncate max-w-[70px] ${
                  isActive ? 'font-bold text-accent' : 'font-medium text-ink-subtle'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* "Lainnya" Button */}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 min-h-[48px] min-w-[44px] py-1 transition-all rounded-md active:scale-95 ${
            isMoreActive ? 'text-accent' : 'text-ink-subtle hover:text-ink'
          }`}
        >
          <div
            className={`p-1.5 rounded-md transition-colors ${
              isMoreActive ? 'bg-accent-subtle text-accent' : 'bg-transparent text-ink-subtle'
            }`}
          >
            <MoreHorizontal className="w-5 h-5 shrink-0" />
          </div>
          <span
            className={`text-[10px] tracking-tight mt-0.5 truncate max-w-[70px] ${
              isMoreActive ? 'font-bold text-accent' : 'font-medium text-ink-subtle'
            }`}
          >
            Lainnya
          </span>
        </button>
      </nav>

      {/* "Lainnya" Menu Bottom Sheet Modal */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-surface-dark/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full bg-surface-raised rounded-t-xl shadow-2xl border-t border-border max-h-[80vh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] font-sans animate-in slide-in-from-bottom duration-200">
            <div className="pt-2.5 pb-1 flex justify-center">
              <span className="w-10 h-1 rounded-full bg-border" />
            </div>

            <div className="px-4 pb-3 pt-1 flex items-center justify-between border-b border-border">
              <div>
                <h3 className="text-sm font-bold text-ink">Menu Web Fleet Lainnya</h3>
                <p className="text-[11px] text-ink-subtle">Akses cepat menu armada & profil</p>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-ink-subtle hover:text-ink hover:bg-surface active:bg-accent-subtle transition-colors cursor-pointer"
                aria-label="Tutup menu lainnya"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 space-y-2">
              {moreTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleNavigate(tab.id)}
                    className={`w-full min-h-[48px] flex items-center gap-3 px-3.5 py-2.5 rounded-md border text-left transition-all ${
                      isActive
                        ? 'bg-accent text-white border-accent font-semibold shadow-xs'
                        : 'bg-surface text-ink border-border hover:bg-accent-subtle hover:text-accent font-medium'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-surface-raised text-accent border border-border'
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
