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
  LogOut, 
  PlusCircle, 
  Settings,
  Activity
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
    // Super Admin (Admin Panel & Master Controls)
    { id: 'admin-panel', label: 'Admin Panel & Sistem', icon: Settings, roles: ['Super Admin'] },
    { id: 'dashboard', label: 'Monitoring Operasional', icon: LayoutDashboard, roles: ['Super Admin'] },
    { id: 'security-dashboard', label: 'Pos Gerbang Security', icon: ShieldCheck, roles: ['Super Admin'] },
    { id: 'sa', label: 'Service Advisor (SPK)', icon: ClipboardList, roles: ['Super Admin'] },
    { id: 'foreman', label: 'Foreman (QC Workshop)', icon: Wrench, roles: ['Super Admin'] },
    { id: 'purchasing', label: 'Purchasing & Part', icon: ShoppingBag, roles: ['Super Admin'] },
    { id: 'kasir', label: 'Kasir & Faktur Tagihan', icon: Receipt, roles: ['Super Admin'] },
    { id: 'fleet-dashboard', label: 'Portal Armada Fleet', icon: Truck, roles: ['Super Admin'] },

    // Dashboards per Peran
    { id: 'dashboard', label: 'Dashboard SA', icon: LayoutDashboard, roles: ['SA'] },
    { id: 'dashboard', label: 'Dashboard Foreman', icon: LayoutDashboard, roles: ['Foreman'] },
    { id: 'dashboard', label: 'Dashboard Mekanik', icon: LayoutDashboard, roles: ['Mekanik'] },
    { id: 'dashboard', label: 'Dashboard Purchasing', icon: LayoutDashboard, roles: ['Admin Purchasing'] },
    { id: 'dashboard', label: 'Dashboard Kasir', icon: LayoutDashboard, roles: ['Admin Invoice'] },
    { id: 'dashboard', label: 'Dashboard Kunjungan', icon: LayoutDashboard, roles: ['PIC Terkait'] },

    // Security (6 Menu Resmi: Dashboard, Check In Masuk, Booking, On Progress, Selesai / Keluar, Memo Keluar)
    { id: 'security-dashboard', label: 'Dashboard Pos Gerbang', icon: LayoutDashboard, roles: ['Security'] },
    { id: 'security-checkin', label: 'Check In Masuk', icon: PlusCircle, roles: ['Security'] },
    { id: 'security-booking', label: 'List Nopol Booking', icon: Calendar, roles: ['Security'] },
    { id: 'security-onprogress', label: 'Nopol di Bengkel (On Progress)', icon: Clock, roles: ['Security'] },
    { id: 'security-selesai', label: 'Telah Meninggalkan Bengkel', icon: LogOut, roles: ['Security'] },
    { id: 'security-memo', label: 'Memo Keluar Resmi', icon: FileText, roles: ['Security'] },

    // SA
    { id: 'sa', label: 'Service Advisor (SPK)', icon: ClipboardList, roles: ['SA'] },
    { id: 'purchasing', label: 'Status Part & PO (Kotak Merah)', icon: ShoppingBag, roles: ['SA'] },
    { id: 'beli-part', label: 'Penjualan Part Langsung', icon: Package, roles: ['SA'] },
    
    // Foreman
    { id: 'foreman', label: 'Foreman (QC & Penugasan)', icon: Wrench, roles: ['Foreman'] },
    { id: 'mekanik', label: 'Live Monitoring Mekanik', icon: Clock, roles: ['Foreman'] },

    // Mekanik
    { id: 'mekanik', label: 'Pekerjaan Saya (Stopwatch)', icon: Clock, roles: ['Mekanik'] },

    // Purchasing
    { id: 'purchasing', label: 'PR, PO & Kotak Merah', icon: ShoppingBag, roles: ['Admin Purchasing'] },

    // Kasir / Admin Invoice
    { id: 'kasir', label: 'Kasir & Faktur Tagihan', icon: Receipt, roles: ['Admin Invoice'] },
    { id: 'beli-part', label: 'Penjualan Part Langsung', icon: Package, roles: ['Admin Invoice', 'Warehouse'] },

    // Customer Fleet (7 Sub-menu Terpisah)
    { id: 'fleet-dashboard', label: 'Dashboard Armada', icon: LayoutDashboard, roles: ['Customer Fleet'] },
    { id: 'fleet-booking', label: 'Booking Service Baru', icon: Calendar, roles: ['Customer Fleet'] },
    { id: 'fleet-status', label: 'Status & Pelacakan Unit', icon: Truck, roles: ['Customer Fleet'] },
    { id: 'fleet-history', label: 'Histori Servis & Invoice', icon: Receipt, roles: ['Customer Fleet'] },
    { id: 'fleet-kendaraan', label: 'Daftar Armada Truk', icon: Car, roles: ['Customer Fleet'] },
    { id: 'fleet-dokumen', label: 'Dokumen STNK & KIR', icon: FileText, roles: ['Customer Fleet'] },
    { id: 'fleet-profil', label: 'Profil Customer & Kontak', icon: Building2, roles: ['Customer Fleet'] },

    // PIC Terkait (Konfirmasi Kunjungan Tamu)
    { id: 'pic-terkait', label: 'Konfirmasi Tamu (PIC)', icon: UserCheck, roles: ['PIC Terkait'] },
  ];

  // Strictly filter menus for the active role (no crossover)
  const roleMenus = allNavigationItems.filter((item) => item.roles.includes(currentRole));

  return (
    <aside className="w-64 bg-surface-raised border-r border-border hidden md:flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)] p-3 font-sans">
      <div>
        <div className="px-2 mb-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle">
            Menu {currentRole}
          </p>
        </div>
        <nav className="space-y-1">
          {roleMenus.map((item) => {
            const Icon = item.icon;
            // Prefix-match agar sub-tab deep-link (mis. sa-penerimaan, security-checkin)
            // tetap menyorot menu induknya.
            const isActive = activeTab === item.id || activeTab.startsWith(`${item.id}-`);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-all ${
                  isActive
                    ? 'bg-accent text-white font-semibold shadow-2xs'
                    : 'text-ink-muted hover:text-ink hover:bg-accent-subtle/60 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-ink-subtle'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Workshop System Indicator Footer */}
      <div className="border-t border-border pt-3 px-2">
        <div className="flex items-center gap-2 text-[10px] text-ink-subtle font-mono">
          <Activity className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="truncate">KIM3 Workshop Shell</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
