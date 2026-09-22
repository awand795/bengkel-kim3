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
  Receipt
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, currentRole } = useAppStore();

  const getRoleTabs = () => {
    switch (currentRole) {
      case 'SA':
        return [
          { id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
          { id: 'sa', label: 'SPK & Estimasi', icon: ClipboardList },
          { id: 'purchasing', label: 'Purchasing', icon: ShoppingBag },
          { id: 'beli-part', label: 'Beli Part', icon: Package },
          { id: 'fleet', label: 'Fleet Portal', icon: Truck },
        ];
      case 'Foreman':
        return [
          { id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
          { id: 'foreman', label: 'SPK Foreman', icon: Wrench },
          { id: 'mekanik', label: 'Mekanik Live', icon: Clock },
          { id: 'sa', label: 'Cek SA', icon: ClipboardList },
        ];
      case 'Mekanik':
        return [
          { id: 'mekanik', label: 'Pekerjaan', icon: Clock },
          { id: 'foreman', label: 'Foreman', icon: Wrench },
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        ];
      case 'Admin Purchasing':
        return [
          { id: 'purchasing', label: 'PR & PO', icon: ShoppingBag },
          { id: 'sa', label: 'Estimasi SA', icon: ClipboardList },
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        ];
      case 'Admin Invoice':
        return [
          { id: 'kasir', label: 'Kasir & Inv', icon: Receipt },
          { id: 'beli-part', label: 'Beli Part', icon: Package },
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        ];
      case 'Security':
        return [
          { id: 'security', label: 'Pos Security', icon: ShieldCheck },
          { id: 'dashboard', label: 'Monitoring', icon: LayoutDashboard },
          { id: 'fleet', label: 'Armada', icon: Truck },
        ];
      case 'Customer Fleet':
      default:
        return [
          { id: 'fleet', label: 'Web Fleet', icon: Truck },
          { id: 'dokumen', label: 'Dokumen', icon: ClipboardList },
          { id: 'kendaraan', label: 'Armada', icon: ShieldCheck },
          { id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
        ];
    }
  };

  const tabs = getRoleTabs();

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 lg:hidden z-40 py-1.5 px-2 flex items-center justify-around shadow-lg">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              isActive ? 'text-blue-600 scale-105 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-lg ${isActive ? 'bg-blue-50' : 'bg-transparent'}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
