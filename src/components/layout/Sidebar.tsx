import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { 
  LayoutDashboard, 
  ShieldCheck, 
  ClipboardList, 
  Wrench, 
  ShoppingBag, 
  Receipt, 
  Package, 
  Truck, 
  FileText,
  Clock,
  Car
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, currentRole } = useAppStore();

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard Ringkasan', icon: LayoutDashboard },
    { id: 'security', label: 'Pos Security', icon: ShieldCheck, roles: ['Security', 'SA', 'Customer Fleet'] },
    { id: 'sa', label: 'Service Advisor (SA)', icon: ClipboardList, roles: ['SA', 'Foreman'] },
    { id: 'foreman', label: 'Foreman (QC & SPK)', icon: Wrench, roles: ['Foreman', 'SA', 'Mekanik'] },
    { id: 'mekanik', label: 'Mekanik (Tablet/HP)', icon: Clock, roles: ['Mekanik', 'Foreman'] },
    { id: 'purchasing', label: 'Admin Purchasing (PO & ETA)', icon: ShoppingBag, roles: ['Admin Purchasing', 'SA'] },
    { id: 'beli-part', label: 'Beli Part (Tanpa Service)', icon: Package, roles: ['SA', 'Admin Invoice', 'Warehouse'] },
    { id: 'kasir', label: 'Invoice & Pembayaran', icon: Receipt, roles: ['Admin Invoice', 'SA'] },
    { id: 'fleet', label: 'Web Fleet Customer', icon: Truck, roles: ['Customer Fleet', 'SA'] },
    { id: 'dokumen', label: 'Dokumen Armada (STNK/KIR)', icon: FileText, roles: ['Customer Fleet', 'SA'] },
    { id: 'kendaraan', label: 'Armada Kendaraan', icon: Car, roles: ['Customer Fleet', 'SA', 'Security'] },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 hidden lg:flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)] p-4">
      <div>
        <div className="px-3 mb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Modul Operasional</p>
        </div>
        <nav className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isRoleRecommended = item.roles?.includes(currentRole);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {isRoleRecommended && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Workshop Location Badge */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 text-white shadow-sm">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
          <span className="text-[11px] font-bold text-slate-200">KIM 3 Medan Online</span>
        </div>
        <p className="text-[10px] text-slate-300 leading-relaxed">
          Kawasan Industri KIM 3 Medan
        </p>
        <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-blue-200">
          <span>Koneksi Sistem</span>
          <span className="font-mono text-emerald-400">Online</span>
        </div>
      </div>
    </aside>
  );
};
