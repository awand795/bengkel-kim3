import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { 
  LayoutDashboard, 
  Calendar, 
  Receipt, 
  Truck, 
  FileText, 
  Building2, 
  HelpCircle,
  Phone,
  MessageCircle
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: any;
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, bumpNav } = useAppStore();

  const navigationItems: NavItem[] = [
    { id: 'fleet-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'fleet-booking', label: 'Booking Service', icon: Calendar },
    { id: 'fleet-history', label: 'History Service', icon: Receipt },
    { id: 'fleet-dokumen', label: 'Dokumen Saya', icon: FileText },
    { id: 'fleet-kendaraan', label: 'Kendaraan Saya', icon: Truck },
    { id: 'fleet-profil', label: 'Profil Perusahaan', icon: Building2 },
    { id: 'fleet-bantuan', label: 'Bantuan', icon: HelpCircle },
  ];

  const isTabActive = (tabId: string) => {
    if (activeTab === tabId) return true;
    if (tabId === 'fleet-dashboard' && activeTab === 'dashboard') return true;
    return false;
  };

  const handleItemClick = (id: string) => {
    if (id === 'fleet-bantuan') {
      window.open('https://wa.me/6281234567890?text=Halo%20Bengkel%20KIM3%2C%20saya%20butuh%20bantuan%20terkait%20Web%20Fleet', '_blank');
      return;
    }
    setActiveTab(id);
    bumpNav();
  };

  return (
    <aside className="w-64 bg-white dark:bg-surface-raised border-r border-[#E2E8F0] dark:border-border hidden md:flex flex-col justify-between shrink-0 min-h-[calc(100vh-60px)] py-5 px-4 font-sans overflow-y-auto">
      <div>
        <nav className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = isTabActive(item.id);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer relative overflow-hidden group ${
                  isActive
                    ? 'bg-[#EEF2FF] dark:bg-blue-950/40 text-[#12388F] dark:text-blue-300 font-semibold pl-4 shadow-xs'
                    : 'text-[#475569] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-white/5 font-medium'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 inset-y-0 w-[3px] bg-[#12388F] dark:bg-blue-400" />
                )}
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#12388F] dark:text-blue-300' : 'text-[#475569] dark:text-slate-400 group-hover:text-[#0F172A] dark:group-hover:text-white'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Assistance Card & Copyright as shown in Mockup image5.png */}
      <div className="space-y-4 pt-6">
        <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-surface border border-[#E2E8F0] dark:border-border text-[#475569] space-y-2.5 shadow-2xs">
          <div className="text-xs font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-[#12388F] dark:text-blue-400" />
            <span>Butuh Bantuan?</span>
          </div>
          <p className="text-[11px] text-[#475569] dark:text-slate-300 leading-relaxed">
            Hubungi kami jika ada pertanyaan atau kendala.
          </p>
          <div className="flex items-center gap-2 text-xs font-bold font-mono text-[#0F172A] dark:text-white">
            <Phone className="w-3.5 h-3.5 text-[#12388F] dark:text-blue-400" />
            <span>0812-3456-7890</span>
          </div>
          <a
            href="https://wa.me/6281234567890?text=Halo%20Bengkel%20KIM3%2C%20saya%20butuh%20bantuan%20Web%20Fleet"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold transition-colors shadow-2xs"
          >
            <MessageCircle className="w-3.5 h-3.5 text-white" />
            <span>Chat WhatsApp</span>
          </a>
        </div>

        <div className="text-center text-[10px] text-[#94A3B8] pt-1 border-t border-[#E2E8F0] dark:border-border">
          &copy; 2026 KIM3 Bengkel. All rights reserved.
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
