import React from 'react';
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
  Car
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, currentRole } = useAppStore();

  const getRoleTabs = () => {
    switch (currentRole) {
      case 'Security':
        return [
          { id: 'security', label: 'Pos Gerbang', icon: ShieldCheck },
          { id: 'kendaraan', label: 'Armada', icon: Car },
        ];
      case 'Mekanik':
        return [
          { id: 'mekanik', label: 'Pekerjaan Saya', icon: Clock },
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
        return [
          { id: 'fleet', label: 'Web Fleet', icon: Truck },
          { id: 'dokumen', label: 'STNK & KIR', icon: FileText },
          { id: 'kendaraan', label: 'Armada', icon: Car },
        ];
    }
  };

  const tabs = getRoleTabs();

  // If role only has 1 tab (like Mekanik on phone), no need for cluttered bottom bar
  if (tabs.length <= 1) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 lg:hidden z-40 py-1.5 px-3 flex items-center justify-around shadow-lg">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
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
    </nav>
  );
};

export default MobileBottomNav;
