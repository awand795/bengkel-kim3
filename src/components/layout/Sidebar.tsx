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
  Car,
  Calendar,
  Building2,
  UserCheck,
  LogOut
} from 'lucide-react';
import { PeranUser } from '../../types';

interface NavItem {
  id: string;
  label: string;
  icon: any;
  roles: PeranUser[];
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, currentRole } = useAppStore();

  const allNavigationItems: NavItem[] = [
    // Dashboard (SA, Foreman, Purchasing, Kasir)
    { id: 'dashboard', label: 'Ringkasan Bengkel', icon: LayoutDashboard, roles: ['SA', 'Foreman', 'Admin Purchasing', 'Admin Invoice'] },
    
    // Security (5 Menu Resmi sesuai Excel: Dashboard, Booking, On Progress, Selesai / Keluar, Memo Keluar)
    { id: 'security-dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Security'] },
    { id: 'security-booking', label: 'Booking', icon: Calendar, roles: ['Security'] },
    { id: 'security-onprogress', label: 'On Progress', icon: Clock, roles: ['Security'] },
    { id: 'security-selesai', label: 'Selesai / Keluar', icon: LogOut, roles: ['Security'] },
    { id: 'security-memo', label: 'Memo Keluar', icon: FileText, roles: ['Security'] },

    // SA
    { id: 'sa', label: 'Service Advisor (SPK)', icon: ClipboardList, roles: ['SA'] },
    { id: 'purchasing', label: 'Status Part & PO (Kotak Merah)', icon: ShoppingBag, roles: ['SA', 'Admin Purchasing'] },
    { id: 'beli-part', label: 'Beli Part (Tanpa Servis)', icon: Package, roles: ['SA', 'Admin Invoice', 'Warehouse'] },
    { id: 'dokumen', label: 'Dokumen STNK & KIR', icon: FileText, roles: ['SA'] },
    
    // Foreman
    { id: 'foreman', label: 'Foreman (QC & Penugasan)', icon: Wrench, roles: ['Foreman'] },
    { id: 'mekanik', label: 'Live Monitoring Mekanik', icon: Clock, roles: ['Foreman'] },

    // Mekanik
    { id: 'mekanik', label: 'Pekerjaan Saya (Stopwatch)', icon: Clock, roles: ['Mekanik'] },

    // Kasir
    { id: 'kasir', label: 'Kasir & Memo Keluar', icon: Receipt, roles: ['Admin Invoice'] },

    // Customer Fleet (7 Sub-menu Terpisah)
    { id: 'fleet-dashboard', label: 'Ringkasan Armada', icon: LayoutDashboard, roles: ['Customer Fleet'] },
    { id: 'fleet-booking', label: 'Booking Service Baru', icon: Calendar, roles: ['Customer Fleet'] },
    { id: 'fleet-status', label: 'Status & Pelacakan Unit', icon: Truck, roles: ['Customer Fleet'] },
    { id: 'fleet-history', label: 'Histori Servis & Invoice', icon: Receipt, roles: ['Customer Fleet'] },
    { id: 'fleet-kendaraan', label: 'Daftar Armada Truk', icon: Car, roles: ['Customer Fleet'] },
    { id: 'fleet-dokumen', label: 'Dokumen STNK & KIR', icon: FileText, roles: ['Customer Fleet'] },
    { id: 'fleet-profil', label: 'Profil Customer & Kontak', icon: Building2, roles: ['Customer Fleet'] },

    // PIC Terkait (Konfirmasi Kunjungan Tamu)
    { id: 'pic-terkait', label: 'Konfirmasi Kunjungan (PIC)', icon: UserCheck, roles: ['PIC Terkait'] },
  ];

  // Strictly filter menus for the active role (no crossover)
  const roleMenus = allNavigationItems.filter((item) => item.roles.includes(currentRole));

  return (
    <aside className="w-64 bg-white border-r border-slate-200 hidden lg:flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)] p-4">
      <div>
        <div className="px-3 mb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Menu {currentRole}
          </p>
        </div>
        <nav className="space-y-1">
          {roleMenus.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
